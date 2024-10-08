import express from "express";
import db from "@repo/db/client";
const app = express();

app.use(express.json());

app.get("/hdfcWebhook/getToken", async (req, res) => {});

app.post("/hdfcWebhook", async (req, res) => {


  const paymentInformation: {
    token: string;
    userId: string;
    amount: string;
  } = {
    token: req.body.token,
    userId: req.body.user_identifier,
    amount: req.body.amount,
  };


  console.log(paymentInformation,'this is the request things');

  //TODO: Add zod validation here?
  //TODO: HDFC bank should ideally send us a secret so we know this is sent by them
  const request = await db.onRampTransaction.findFirst({
    where: {
      token: paymentInformation.token,
    },
  });

  console.log(request,'this is the data from db');
  if (
    (request?.status == "Processing" &&
      request.amount == Number(paymentInformation.amount))&&
    request.userId == Number(paymentInformation.userId)
  ) {
    try {
      await db.$transaction([
        db.balance.updateMany({
          where: {
            userId: Number(paymentInformation.userId),
          },
          data: {
            amount: {
              increment: Number(paymentInformation.amount),
            },
          },
        }),
        db.onRampTransaction.updateMany({
          where: {
            token: paymentInformation.token,
          },
          data: {
            status: "Success",
          },
        }),
      ]);
      res.status(201).json({
        message: "Captured",
      });
    } catch (e) {
      console.error(e);
      res.status(411).json({
        message: "Error while processing webhook",
      });
    }
  } else {
    res.status(411).json({
      message: "Duplicate Request",
    });
  }

});

app.listen(3003);
