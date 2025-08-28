export const GetOrderByCartToken = `query GetOrderByCartToken($q: String!, $first: Int = 1) {
  orders(first: $first, query: $q, sortKey: PROCESSED_AT, reverse: true) {
    nodes {
      id
    }
  }
}`;


// usage
// {
//     "q": "cart_token:hWN2G0uTtUgueMeSe9C8SJM2",
//     "first": 1
//   }
