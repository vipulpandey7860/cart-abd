import type { MailMessage } from "./sqs";

export function generateAbandonedCartEmailHTML(mailData: MailMessage): string {
  const { shop, checkoutUrl, products, totalProducts, totalAmount } = mailData;
  
  const productItems = products.map((product) => {
    const productImageUrl = product.imageUrl || 'https://via.placeholder.com/150x150?text=No+Image';
    
    return `
      <img src="${productImageUrl}" alt="${product.title}" width="100" height="100">
      <p><strong>${product.title}</strong></p>
      <p>Quantity: ${product.quantity}</p>
      <p>Price: ${product.currencyCode} ${product.price}</p>
      <br>
    `;
  }).join('');

  const moreProductsText = totalProducts > 2 ? 
    `<p><em>... and ${totalProducts - 2} more item${totalProducts - 2 > 1 ? 's' : ''} in your cart</em></p>` : '';

  const shopName = shop.replace('.myshopify.com', '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>You left something behind!</title>
    </head>
    <body>
      <h1>You left something behind!</h1>
      
      <p>Hi there!</p>
      
      <p>We noticed you left some great items in your cart at ${shopName}. Don't worry, we've saved them for you!</p>
      
      <h2>Your Cart Items</h2>
      
      ${productItems}
      ${moreProductsText}
      
      <p><strong>Total: ${totalAmount.currencyCode} ${totalAmount.amount}</strong></p>
      
      <p><a href="${checkoutUrl}">Complete Your Purchase</a></p>
      
      <p>If you have any questions, feel free to reply to this email.</p>
      
      <p>Happy shopping!<br>The ${shopName} Team</p>
    </body>
    </html>
  `;
}