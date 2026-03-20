import AWS from "aws-sdk";

const sts = new AWS.STS();

sts.getCallerIdentity({}, (err, data) => {
  if (err) console.log("STS ERROR", err);
  else console.log("CURRENT USER:", data);
});