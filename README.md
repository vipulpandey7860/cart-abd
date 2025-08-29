What i am trying to do

1. Listen to carts/create webhook and push it to sqs as soon as it is received
2. Created a worker that polls this queue every 5 sec and put that webhook in db (worker.ts)
3. Then I have another worker (abandoned-cart.ts) which runs every 30 sec (for testing in prod every 4 hours) that check if cart is abandoned or not.
4. I check this by sending a unauthenticated query to getCartById query, if cart is null means order was created if not then it was abandoned
    - why am I using storefront insted if admin, I think admin might rate limit us and that can affect main app, storefront being non ratelimited.


Issues I faced - getting customer data (I still didn't get it)

1. what I tried - looking in docs i found i need key attribute with id to get the customer data, but key is not in webhook payload
 - key can be found using sending /cart.js request in same session where cart was created (not possible to do from server)
 - Tried to update the cart (that webhook gave) but we need key here too.
 