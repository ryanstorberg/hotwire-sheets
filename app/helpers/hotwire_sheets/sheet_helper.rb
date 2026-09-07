require "json"

module HotwireSheets
  module SheetHelper
    # The helper owns structural markup; blocks are ordinary captured Rails views.
    def hotwire_sheet(id:, detents: nil, initial_detent: 0, edge: :bottom,
                      modal: true, open: false, **options, &block)
      silk_detents = options[:detent_mode].to_s == "silk"
      detents = (silk_detents ? [] : ["content"]) if detents.nil?
      detents = [detents] if silk_detents && detents.is_a?(String)
      raise ArgumentError, "id must be present" if id.to_s.empty?
      raise ArgumentError, "edge must be top, bottom, left, or right" unless %w[top bottom left right].include?(edge.to_s)
      raise ArgumentError, "detents must be a nonempty array" unless detents.is_a?(Array) && (silk_detents || detents.any?)
      raise ArgumentError, "initial_detent must be a valid zero-based index" unless initial_detent.is_a?(Integer) && (0...(detents.length + (silk_detents ? 1 : 0))).cover?(initial_detent)
      detents.each do |detent|
        length = detent.is_a?(String) && detent.match(/\A(\+?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?:%|cm|mm|q|in|pc|pt|px|r?(?:em|ex|cap|ch|ic|lh)|[sld]?v(?:h|w|b|i|min|max)|cq(?:w|h|b|i|min|max))\z/i)
        valid = detent == "content" || (detent.is_a?(Numeric) && detent > 0 && detent <= 1) ||
          (length && length[1].to_f > 0) || (detent.is_a?(String) && detent.match?(/\A[a-z][a-z0-9-]*\(.+\)\z/i))
        raise ArgumentError, "invalid detent: #{detent.inspect}" unless valid
      end
      html = options.delete(:html) || {}
      label = options.delete(:label)
      description = options.delete(:description)
      browser_options = sheets_browser_options(options)
      unknown = browser_options.keys - %w[dismissible swipeToDismiss swipeFromOutside scrollEndDismiss oppositeEdgeDismiss closeOnEscape closeOnOutside draggable handleOnly wheel preventEdgeSwipe restoreFocus autofocus portal stackEffect spring trapFocus lockScroll inert initialFocus animation scrollSnap componentId forComponent stack sheetRole defaultPresented presented defaultActiveDetent activeDetent detentMode contentPlacement tracks swipeTrap swipeOvershoot swipeDismissal swipe nativeEdgeSwipePrevention enteringAnimationSettings exitingAnimationSettings steppingAnimationSettings inertOutside onPresentAutoFocus onDismissAutoFocus onClickOutside onEscapeKeyDown nativeFocusScrollPrevention container swipeable themeColorDimming travelAnimation stackingAnimation onPress]
      raise ArgumentError, "unknown sheet options: #{unknown.join(', ')}" if unknown.any?
      builder = Builder.new(self, id.to_s, label: label, description: description, modal: options.fetch(:inert_outside, modal), role: options.fetch(:sheet_role, "dialog"))
      content = capture(builder, &block)
      data = (html[:data] || {}).merge(sheet_root: "", sheet_detents_value: detents.to_json,
        sheet_initial_detent_value: initial_detent, sheet_edge_value: edge,
        sheet_modal_value: modal, sheet_open_value: open, sheet_options_value: browser_options.to_json)
      data[:controller] = [html.dig(:data, :controller), "sheet"].compact.join(" ")
      tag.div(content, **html.merge(id: id, data: data))
    end

    def hotwire_sheet_trigger(text = nil, sheet:, action: nil, on_press: nil, **options, &block)
      data = (options.delete(:data) || {}).merge(action ? { sheet_for: sheet, sheet_action: sheets_browser_options(action).to_json } : { sheet_open: sheet })
      data[:sheet_on_press] = sheets_browser_options(on_press).to_json if on_press
      aria = (options.delete(:aria) || {}).merge(controls: "#{sheet}-content", expanded: false, haspopup: "dialog")
      content = block ? capture(&block) : text
      if options[:href]
        tag.a(content, **options.merge(data: data, aria: aria))
      else
        tag.button(content, **{ type: "button" }.merge(options).merge(data: data, aria: aria))
      end
    end

    def sheets_browser_options(value)
      case value
      when Hash then value.to_h { |key, item| [key.to_s.gsub(/_([a-z])/) { Regexp.last_match(1).upcase }, sheets_browser_options(item)] }
      when Array then value.map { |item| sheets_browser_options(item) }
      else value
      end
    end

    def hotwire_sheet_stack(id:, html: {}, &block)
      sheets_primitive("sheet-stack", { component_id: id }, html.merge(id: id), &block)
    end

    def hotwire_sheet_outlet(for_component: nil, travel_animation: nil, stacking_animation: nil, html: {}, **options, &block)
      sheets_primitive("sheet-outlet", options.merge(for_component: for_component, travel_animation: travel_animation, stacking_animation: stacking_animation).compact, html, &block)
    end

    def hotwire_sheet_island(html: {}, **options, &block)
      sheets_primitive("sheet-island", options, html, &block)
    end

    def hotwire_sheet_external_overlay(html: {}, **options, &block)
      sheets_primitive("sheet-external-overlay", options, html, &block)
    end

    def hotwire_sheet_auto_focus(timing:, html: {}, **options, &block)
      sheets_primitive("sheet-auto-focus", options.merge(timing: timing), html, &block)
    end

    def hotwire_sheet_fixed(html: {}, &block)
      sheets_primitive("sheet-fixed", {}, html, &block)
    end

    def hotwire_sheet_visually_hidden(text = nil, **html, &block)
      tag.span(block ? capture(&block) : text, **html.merge(class: [html[:class], "sheet-visually-hidden"].compact.join(" ")))
    end

    def hotwire_scroll(id:, html: {}, **options, &block)
      builder = ScrollBuilder.new(self, id)
      sheets_primitive("sheet-scroll", options.merge(component_id: id), html.merge(id: id)) { capture(builder, &block) }
    end

    def hotwire_scroll_trigger(text = nil, scroll:, action:, on_press: nil, **html, &block)
      data = (html.delete(:data) || {}).merge(scroll_for: scroll, scroll_action: sheets_browser_options(action).to_json)
      data[:scroll_on_press] = sheets_browser_options(on_press).to_json if on_press
      tag.button(block ? capture(&block) : text, **{ type: "button" }.merge(html).merge(data: data))
    end

    def sheets_primitive(identifier, options, html = {}, &block)
      element = html.delete(:as) || :div
      data = (html[:data] || {}).merge("#{identifier}-options-value" => sheets_browser_options(options).to_json)
      data[:controller] = [data[:controller], identifier].compact.join(" ")
      tag.public_send(element, block ? capture(&block) : nil, **html.merge(data: data))
    end

    class ScrollBuilder
      def initialize(view, id)
        @view, @id = view, id
      end
      def view(**html, &block)
        @view.tag.div(@view.capture(&block), **html.merge(data: (html[:data] || {}).merge(scroll_view: "")))
      end
      def content(**html, &block)
        @view.tag.div(@view.capture(&block), **html.merge(data: (html[:data] || {}).merge(scroll_content: "")))
      end
      def trigger(text = nil, **options, &block)
        @view.hotwire_scroll_trigger(text, scroll: @id, **options, &block)
      end
    end

    class Builder
      def initialize(view, id, label:, description:, modal:, role: "dialog")
        @view, @id, @label, @description, @modal = view, id, label, description, modal
        @parts = {}
        @role = role.to_s
      end

      def trigger(text = nil, **options, &block)
        @view.hotwire_sheet_trigger(text, sheet: @id, **options, &block)
      end

      def backdrop(**options)
        @backdrop_options = options
        @view.safe_join([])
      end

      # Includes a backdrop by default, and guarantees a hidden server-rendered view.
      def content(backdrop: true, view: {}, **options, &block)
        raise ArgumentError, "a sheet can have only one content block" if @parts[:content]
        @parts[:content] = true
        inner = @view.capture(&block)
        aria = (options.delete(:aria) || {}).dup
        aria[:label] ||= @label if @label
        aria[:labelledby] ||= "#{@id}-title" if @parts[:title] && !aria[:label]
        aria[:describedby] ||= "#{@id}-description" if @parts[:description]
        raise ArgumentError, "provide sheet.title, label:, or aria: { label: ... } for an accessible name" unless aria[:label] || aria[:labelledby]
        aria[:modal] = true if @modal && %w[dialog alertdialog].include?(@role)
        panel = @view.tag.div(inner, **options.merge(id: "#{@id}-content", role: @role, tabindex: -1,
          aria: aria, data: (options[:data] || {}).merge(sheet_content: "")))
        backdrop_options = @backdrop_options || {}
        overlay = @view.tag.div(**backdrop_options.merge(data: (backdrop_options[:data] || {}).merge(sheet_backdrop: ""), aria: { hidden: true })) if backdrop
        children = @view.safe_join([overlay, panel].compact)
        @view.tag.div(children, **view.merge(hidden: true, data: (view[:data] || {}).merge(sheet_view: "", sheet_edge: "bottom")))
      end

      def handle(label: "Resize sheet. Use arrow keys to change size.", action: "step", **options)
        @view.tag.button(@view.tag.span(label, class: "sheet-visually-hidden"), **{ type: "button" }.merge(options).merge(aria: (options[:aria] || {}).merge(label: label),
          data: (options[:data] || {}).merge(sheet_handle: "", sheet_for: @id, sheet_action: @view.sheets_browser_options(action).to_json)))
      end

      def title(text = nil, **options, &block)
        @parts[:title] = true
        @view.tag.h2(block ? @view.capture(&block) : text, **options.merge(id: "#{@id}-title"))
      end

      def description(text = @description, **options, &block)
        @parts[:description] = true
        @view.tag.p(block ? @view.capture(&block) : text, **options.merge(id: "#{@id}-description"))
      end

      def body(**options, &block)
        @view.tag.div(@view.capture(&block), **options.merge(data: (options[:data] || {}).merge(sheet_body: "")))
      end

      def bleeding_background(**options)
        @view.tag.div(**options.merge(data: (options[:data] || {}).merge(sheet_bleeding_background: ""), aria: { hidden: true }))
      end

      def outlet(**options, &block)
        @view.hotwire_sheet_outlet(for_component: @id, **options, &block)
      end

      def close(text = "Close", **options, &block)
        @view.tag.button(block ? @view.capture(&block) : text, **{ type: "button" }.merge(options).merge(
          data: (options[:data] || {}).merge(sheet_close: "")))
      end
    end
  end
end
