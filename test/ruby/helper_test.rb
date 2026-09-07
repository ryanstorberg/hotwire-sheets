require "minitest/autorun"
require "bigdecimal"
require "action_view"
require_relative "../../app/helpers/hotwire_sheets/sheet_helper"

class HelperTest < Minitest::Test
  def setup
    @view = ActionView::Base.empty
    @view.extend(HotwireSheets::SheetHelper)
  end

  def render_sheet(**options)
    @view.hotwire_sheet(id: "account", **options) do |sheet|
      sheet.content do
        @view.safe_join([sheet.handle, sheet.title("Account"), sheet.body { "Profile" }, sheet.close])
      end
    end
  end

  def test_accessible_markup_and_options
    dom = Nokogiri::HTML.fragment(render_sheet(detents: ["content", 0.5, 1], swipe_to_dismiss: false))
    assert_equal "sheet", dom.at_css("[data-controller]")["data-controller"]
    assert_equal "[\"content\",0.5,1]", dom.at_css("[data-controller]")["data-sheet-detents-value"]
    assert_equal({ "swipeToDismiss" => false }, JSON.parse(dom.at_css("[data-controller]")["data-sheet-options-value"]))
    assert dom.at_css("[data-sheet-view]").key?("hidden")
    assert_equal "account-title", dom.at_css("[role=dialog]")["aria-labelledby"]
    assert_equal "true", dom.at_css("[role=dialog]")["aria-modal"]
    assert_equal "button", dom.at_css("[data-sheet-close]")["type"]
  end

  def test_serializes_native_motion_options
    dom = Nokogiri::HTML.fragment(render_sheet(scroll_snap: true, animation: "waapi"))
    assert_equal({ "scrollSnap" => true, "animation" => "waapi" }, JSON.parse(dom.at_css("[data-controller]")["data-sheet-options-value"]))
  end

  def test_serializes_long_sheet_dismissal
    dom = Nokogiri::HTML.fragment(render_sheet(detents: [1], scroll_end_dismiss: true))
    assert_equal({ "scrollEndDismiss" => true }, JSON.parse(dom.at_css("[data-controller]")["data-sheet-options-value"]))
  end

  def test_serializes_outside_swipe_option
    dom = Nokogiri::HTML.fragment(render_sheet(swipe_from_outside: false))
    assert_equal({ "swipeFromOutside" => false }, JSON.parse(dom.at_css("[data-controller]")["data-sheet-options-value"]))
  end

  def test_serializes_opposite_edge_dismissal
    dom = Nokogiri::HTML.fragment(render_sheet(opposite_edge_dismiss: true))
    assert_equal({ "oppositeEdgeDismiss" => true }, JSON.parse(dom.at_css("[data-controller]")["data-sheet-options-value"]))
  end

  def test_escapes_labels_and_preserves_caller_data
    dom = Nokogiri::HTML.fragment(render_sheet(label: '<script>alert("x")</script>', html: { data: { controller: "analytics", tracking: "test" } }))
    assert_nil dom.at_css("script")
    assert_equal '<script>alert("x")</script>', dom.at_css("[role=dialog]")["aria-label"]
    assert_equal "analytics sheet", dom.at_css("[data-controller]")["data-controller"]
    assert_equal "test", dom.at_css("[data-controller]")["data-tracking"]
  end

  def test_link_trigger_supports_a_real_fallback_route
    dom = Nokogiri::HTML.fragment(@view.hotwire_sheet_trigger("Account", sheet: "account", href: "/account"))
    assert_equal "/account", dom.at_css("a")["href"]
    assert_equal "account-content", dom.at_css("a")["aria-controls"]
    assert_equal "false", dom.at_css("a")["aria-expanded"]
  end

  def test_rejects_invalid_options_and_unnamed_dialogs
    assert_raises(ArgumentError) { render_sheet(edge: :diagonal) }
    assert_raises(ArgumentError) { render_sheet(detents: [0]) }
    assert_raises(ArgumentError) { render_sheet(initial_detent: 3) }
    assert_raises(ArgumentError) { render_sheet(swip_to_dismiss: false) }
    assert_raises(ArgumentError) { @view.hotwire_sheet(id: "missing") { |s| s.content { "No name" } } }
  end

  def test_nonmodal_does_not_claim_modal_semantics
    dom = Nokogiri::HTML.fragment(render_sheet(modal: false))
    assert_nil dom.at_css("[role=dialog]")["aria-modal"]
  end

  def test_explicit_backdrop_is_inside_the_view_and_not_duplicated
    html = @view.hotwire_sheet(id: "custom", label: "Custom") do |sheet|
      @view.safe_join([sheet.backdrop(class: "custom-backdrop"), sheet.content { "Content" }])
    end
    dom = Nokogiri::HTML.fragment(html)
    assert_equal 1, dom.css("[data-sheet-backdrop]").length
    assert dom.at_css("[data-sheet-view] > .custom-backdrop")
  end

  def test_extended_options_and_nested_keys_are_serialized
    dom = Nokogiri::HTML.fragment(render_sheet(sheet_role: "alertdialog", content_placement: "center", tracks: %w[top bottom],
      entering_animation_settings: { preset: "elastic", content_move: false }, on_escape_key_down: { stop_overlay_propagation: false }))
    options = JSON.parse(dom.at_css("[data-controller]")["data-sheet-options-value"])
    assert_equal({ "preset" => "elastic", "contentMove" => false }, options["enteringAnimationSettings"])
    assert_equal false, options.dig("onEscapeKeyDown", "stopOverlayPropagation")
    assert_equal "alertdialog", dom.at_css("[data-sheet-content]")["role"]
  end

  def test_silk_detent_mode_accepts_intermediate_css_lengths_and_implicit_full_size
    dom = Nokogiri::HTML.fragment(render_sheet(detent_mode: "silk", detents: ["calc(100dvh - 24px)", "18rem"]))
    assert_equal ["calc(100dvh - 24px)", "18rem"], JSON.parse(dom.at_css("[data-controller]")["data-sheet-detents-value"])
    default = Nokogiri::HTML.fragment(render_sheet(detent_mode: "silk"))
    assert_equal [], JSON.parse(default.at_css("[data-controller]")["data-sheet-detents-value"])
  end

  def test_handle_is_a_button_and_trigger_supports_step_actions
    dom = Nokogiri::HTML.fragment(render_sheet)
    assert_equal "button", dom.at_css("[data-sheet-handle]").name
    assert dom.at_css("[data-sheet-handle] .sheet-visually-hidden")
    action = Nokogiri::HTML.fragment(@view.hotwire_sheet_trigger("Previous", sheet: "account", action: { type: "step", direction: "down" }))
    assert_equal({ "type" => "step", "direction" => "down" }, JSON.parse(action.at_css("button")["data-sheet-action"]))
  end

  def test_css_length_families_and_non_dialog_roles
    lengths = %w[12pt 1in 5rlh 20dvb 30cqi 1e2px]
    dom = Nokogiri::HTML.fragment(render_sheet(detents: lengths, sheet_role: "status"))
    assert_equal lengths, JSON.parse(dom.at_css("[data-controller]")["data-sheet-detents-value"])
    assert_nil dom.at_css("[role=status]")["aria-modal"]
    assert_raises(ArgumentError) { render_sheet(detents: ["0px"]) }
  end

  def test_scroll_helper_has_separate_view_content_and_trigger
    html = @view.hotwire_scroll(id: "messages", scroll_gesture_trap: { y_start: true }, scroll_snap_type: "mandatory") do |scroll|
      @view.safe_join([scroll.view { scroll.content { "Message" } }, scroll.trigger("Latest", action: { type: "scroll-to", progress: 1 })])
    end
    dom = Nokogiri::HTML.fragment(html)
    assert dom.at_css("[data-scroll-view] > [data-scroll-content]")
    options = JSON.parse(dom.at_css("[data-controller]")["data-sheet-scroll-options-value"])
    assert_equal({ "yStart" => true }, options["scrollGestureTrap"])
    assert_equal "messages", dom.at_css("[data-scroll-action]")["data-scroll-for"]
  end

  def test_auxiliary_helpers_compose_existing_tags_and_escape_text
    dom = Nokogiri::HTML.fragment(@view.hotwire_sheet_auto_focus(timing: "dismiss", for_component: "account", html: { as: :button, type: "button" }) { "Return" })
    assert_equal "button", dom.children.first.name
    assert_equal "sheet-auto-focus", dom.children.first["data-controller"]
    hidden = Nokogiri::HTML.fragment(@view.hotwire_sheet_visually_hidden("<script>"))
    assert_nil hidden.at_css("script")
    assert_equal "<script>", hidden.text
  end
end
