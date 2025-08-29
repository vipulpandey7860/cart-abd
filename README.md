What i am trying to do

1. Listen to carts/create webhook and push it to sqs as soon as it is received
2. Created a worker that polls this queue every 5 sec and put that webhook in db (worker.ts)
3. Then I have another worker (abandoned-cart.ts) which runs every 30 sec (for testing in prod every 4 hours) that check if cart is abandoned or not.
4. I check this by sending a unauthenticated query to getCartById query, if cart is null means order was created if not then it was abandoned
    - why am I using storefront insted if admin, I think admin might rate limit us and that can affect main app, storefront being non ratelimited.


5. After checking I update the db and send an entry in new queue, that will be used to send mails (I am still using SQS but can use SNS too)
 - A worker is setup for this queue which sends the email

6. To check conversions we can have 1 more worker which will get the abandoned orders from db and again fetch them and determine if it was converted (shopify usually delets unprocessed carts in 14 days (or 30 some say it got increased in winter 25 update))


Issues I faced - getting customer data (I still didn't get it)

1. what I tried - looking in docs i found i need key attribute with id to get the customer data, but key is not in webhook payload
 - key can be found using sending /cart.js request in same session where cart was created (not possible to do from server)
 - Tried to update the cart (that webhook gave) but we need key here too.
 - Or we need customer access token
 

I also explored other webhook like checkouts/create, this indeed gives us the customer email (but this might not be super useful as shopify itself have abandoned checkouts feature) but we might be able to get data from here by matching cart token


=================================================================================
what can be improved in this arch-

1. Webhook → SQS

2. SQS → Lambda 
SQS triggers Lambda → Save cart to DB (will have to switch to Dynamo DB to auto scale or have to use prisma accelerate to manage connection pools (in SQLITE or Postgress) (db throughput might be high thus dynamoDB works))
(Debatable but I think this will work)

3. EventBridge (Waits 4 hours)
EventBridge waits exactly 4 hours → Triggers abandonment check Lambda

4. Check Cart Status
Lambda checks Shopify API → Is cart abandoned?

5a. If Abandoned: SNS → Email Lambda
Mark as abandoned in DB → Send to SNS → Email Lambda sends email
5b. Email Lambda Schedules Follow-ups
Email Lambda → Schedule next email via EventBridge (24 hours later)