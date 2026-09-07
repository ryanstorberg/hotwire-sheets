const menu = document.querySelector('.docs-navigation details');
if (matchMedia('(max-width: 749px)').matches) menu.open = false;
document.querySelector('.nav-search input').addEventListener('input', event => {
  const query = event.target.value.toLowerCase().trim();
  for (const link of document.querySelectorAll('.docs-navigation nav a')) link.hidden = !link.textContent.toLowerCase().includes(query);
});
for (const pre of document.querySelectorAll('pre')) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'copy-code'; button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code example');
  button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.querySelector('code').textContent); button.textContent = 'Copied'; }
    catch { button.textContent = 'Select to copy'; }
    setTimeout(() => button.textContent = 'Copy', 2000);
  });
  pre.append(button);
}
