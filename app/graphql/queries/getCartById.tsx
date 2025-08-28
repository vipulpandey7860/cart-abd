export const getCartById = `query getCart($cartId: ID!) {
  cart(id: $cartId) {
    id
    createdAt
    updatedAt
    checkoutUrl
    totalQuantity
    buyerIdentity {
      email
      phone
      countryCode
      customer {
        id
        firstName
        lastName
        email
      }
    }
    
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
    }

    lines(first: 10) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              sku
              price {
                amount
                currencyCode
              }
              product {
                id
                title
                handle
                featuredImage {
                  url
                  altText
                }
              }
            }
          }
          attributes {
            key
            value
          }
          discountAllocations {
            discountedAmount {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
}
`;

// usage
// {
//     "cartId": "gid://shopify/Cart/hWN2G1oJJgKxL0xTS6HC4jLu"

// }