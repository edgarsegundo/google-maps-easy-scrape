// Floating Widget
let extractedCount = 0;
let widgetVisible = false;

function createFloatingWidget() {
  if (document.getElementById('whatsapp-extractor-widget')) return;
  
  const widget = document.createElement('div');
  widget.id = 'whatsapp-extractor-widget';
  widget.className = 'whatsapp-widget-collapsed';
  widget.innerHTML = `
    <div class="widget-header">
      <span class="widget-icon">📱</span>
      <span class="widget-count">${extractedCount}</span>
      <button class="widget-toggle" id="widget-toggle-btn">▼</button>
    </div>
    <div class="widget-body" id="widget-body" style="display: none;">
      <div class="widget-title">WhatsApp Extraídos</div>
      <div class="widget-message" id="widget-message">
        Clique no ícone da extensão para extrair números de WhatsApp desta página.
      </div>
    </div>
  `;
  
  document.body.appendChild(widget);
  
  // Toggle expand/collapse
  document.getElementById('widget-toggle-btn').addEventListener('click', () => {
    const body = document.getElementById('widget-body');
    const btn = document.getElementById('widget-toggle-btn');
    
    if (body.style.display === 'none') {
      body.style.display = 'block';
      btn.textContent = '▲';
      widget.classList.remove('whatsapp-widget-collapsed');
      widget.classList.add('whatsapp-widget-expanded');
    } else {
      body.style.display = 'none';
      btn.textContent = '▼';
      widget.classList.remove('whatsapp-widget-expanded');
      widget.classList.add('whatsapp-widget-collapsed');
    }
  });
}

function updateWidgetCount(count) {
  extractedCount += count;
  const countElement = document.querySelector('.widget-count');
  if (countElement) {
    countElement.textContent = extractedCount;
    
    // Animate count update
    countElement.style.transform = 'scale(1.3)';
    setTimeout(() => {
      countElement.style.transform = 'scale(1)';
    }, 300);
  }
  
  const message = document.getElementById('widget-message');
  if (message) {
    message.innerHTML = `
      <div style="text-align: center; padding: 10px;">
        <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
        <div style="font-weight: 600; color: #16a34a; margin-bottom: 4px;">
          ${count} número(s) extraído(s)!
        </div>
        <div style="font-size: 12px; color: #6b7280;">
          Total na sessão: ${extractedCount}
        </div>
      </div>
    `;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateCount') {
    updateWidgetCount(request.count);
  }
});

// Initialize widget on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingWidget);
} else {
  createFloatingWidget();
}
