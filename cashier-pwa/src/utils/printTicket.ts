/**
 * Utilidad para imprimir tickets desde el PWA
 * Diseñado para impresoras térmicas de 80mm en Windows
 */

export interface PrintItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  extras: PrintExtra[];
}

export interface PrintExtra {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PrintData {
  orderId: number;
  total: number;
  items: PrintItem[];
  paymentMethod?: string;
  paymentId?: string;
}

const STORE_NAME = 'CASA RICA';
const STORE_ADDRESS = '';
const STORE_FOOTER = '¡Gracias por su compra!';

/**
 * Genera el HTML del ticket para impresión térmica
 */
function generateTicketHTML(data: PrintData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR');
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(price);

  // Generar líneas de items
  let itemsHTML = '';
  for (const item of data.items) {
    const itemTotal = item.unitPrice * item.quantity;
    itemsHTML += `
      <div class="item-line">
        <span class="item-name">${item.quantity}x ${item.productName}</span>
        <span class="item-price">${formatPrice(itemTotal)}</span>
      </div>
    `;

    // Extras del item
    for (const extra of item.extras) {
      const extraTotal = extra.unitPrice * extra.quantity * item.quantity;
      const qtyLabel = extra.quantity > 1 ? ` x${extra.quantity}` : '';
      itemsHTML += `
        <div class="extra-line">
          <span class="extra-name">+ ${extra.name}${qtyLabel}</span>
          ${extraTotal > 0 ? `<span class="extra-price">+${formatPrice(extraTotal)}</span>` : ''}
        </div>
      `;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket #${data.orderId}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      padding: 5mm;
      background: white;
      color: black;
    }
    
    .header {
      text-align: center;
      margin-bottom: 10px;
    }
    
    .store-name {
      font-size: 18px;
      font-weight: bold;
    }
    
    .store-address {
      font-size: 11px;
      margin-top: 3px;
    }
    
    .date-line {
      margin-top: 8px;
      font-size: 11px;
    }
    
    .separator {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    
    .order-number {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      margin: 8px 0;
    }
    
    .items-section {
      margin: 10px 0;
    }
    
    .item-line {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    
    .item-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-right: 8px;
    }
    
    .item-price {
      white-space: nowrap;
      text-align: right;
    }
    
    .extra-line {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #333;
      padding-left: 12px;
    }
    
    .extra-name {
      flex: 1;
    }
    
    .extra-price {
      white-space: nowrap;
    }
    
    .total-section {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 2px solid #000;
    }
    
    .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: bold;
    }
    
    .payment-info {
      margin-top: 10px;
      font-size: 11px;
    }
    
    .footer {
      text-align: center;
      margin-top: 15px;
      font-size: 12px;
    }
    
    @media print {
      body {
        width: 80mm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${STORE_NAME}</div>
    ${STORE_ADDRESS ? `<div class="store-address">${STORE_ADDRESS}</div>` : ''}
    <div class="date-line">Fecha: ${dateStr} ${timeStr}</div>
  </div>
  
  <div class="separator"></div>
  
  <div class="order-number">Pedido #${data.orderId}</div>
  
  <div class="separator"></div>
  
  <div class="items-section">
    ${itemsHTML}
  </div>
  
  <div class="total-section">
    <div class="total-line">
      <span>TOTAL</span>
      <span>${formatPrice(data.total)}</span>
    </div>
  </div>
  
  ${data.paymentMethod ? `
  <div class="payment-info">
    <div>Pago: ${data.paymentMethod}</div>
    ${data.paymentId ? `<div>Op: ${data.paymentId}</div>` : ''}
  </div>
  ` : ''}
  
  <div class="separator"></div>
  
  <div class="footer">${STORE_FOOTER}</div>
  
  <script>
    // Impresión automática y cierre de ventana
    window.onload = function() {
      window.print();
      // Cerrar después de imprimir (o cancelar)
      window.onafterprint = function() {
        window.close();
      };
      // Fallback: cerrar después de 5 segundos
      setTimeout(function() {
        window.close();
      }, 5000);
    };
  </script>
</body>
</html>
  `.trim();
}

/**
 * Imprime el ticket abriendo una ventana popup.
 * 
 * Para impresión SILENCIOSA (sin diálogo), iniciar Chrome con:
 *   chrome.exe --kiosk-printing
 * 
 * O en Windows, crear un acceso directo con:
 *   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing http://localhost:5173
 */
export function printTicket(data: PrintData): void {
  const html = generateTicketHTML(data);
  
  // Usamos popup porque el iframe bloquea la página con print()
  const printWindow = window.open('', 'print_ticket', 'width=320,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Esperar a que cargue y luego imprimir
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      // Cerrar después de imprimir (o cancelar)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
    
    // Fallback para cerrar si el usuario cancela sin que se dispare onafterprint
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close();
      }
    }, 60000); // Cerrar después de 1 minuto si quedó abierto
  } else {
    console.error('No se pudo abrir ventana de impresión. Verificar bloqueador de popups.');
    alert('No se pudo abrir la ventana de impresión. Deshabilitá el bloqueador de popups.');
  }
}

/**
 * Genera PrintData desde el carrito antes de enviarlo
 * (útil para imprimir con los datos locales)
 */
export function buildPrintDataFromCart(
  orderId: number,
  cart: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    extras: Array<{
      optionName: string;
      quantity: number;
      pricePerUnit: number;
    }>;
  }>,
  total: number,
  paymentMethod?: string
): PrintData {
  return {
    orderId,
    total,
    paymentMethod,
    items: cart.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      extras: item.extras.map(e => ({
        name: e.optionName,
        quantity: e.quantity,
        unitPrice: e.pricePerUnit,
      })),
    })),
  };
}
