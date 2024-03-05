require('dotenv').config()

import {
    ReceiveMessageCommand,
    DeleteMessageCommand,
    SQSClient,
    DeleteMessageBatchCommand,
  } from "@aws-sdk/client-sqs";


import { copyFinalDist, downloadS3Folder, updateStatus } from "./aws";
import { buildProject } from "./utils";

const client = new SQSClient({});
const SQS_QUEUE_URL = process.env.SQS_URL || "";

const receiveMessage = (queueUrl : string) =>
    client.send(
        new ReceiveMessageCommand({
            AttributeNames: ['SentTimestamp'] as any,
            MaxNumberOfMessages: 10,
            MessageAttributeNames: ["All"],
            QueueUrl: queueUrl,
            WaitTimeSeconds: 20,
            VisibilityTimeout: 20,
        }),
    );

export const main = async (queueUrl = SQS_QUEUE_URL) => {
    while (true) {
        const { Messages } = await receiveMessage(queueUrl);

        if (!Messages) {
            return;
        }

        if (Messages.length === 1) {
            console.log(Messages[0].Body);
            await client.send(
            new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: Messages[0].ReceiptHandle,
            }),
            );

            const id = Messages[0].Body;
            updateStatus(id ?? "", "building");
            await downloadS3Folder(`output/${id}`)
            await buildProject(id ?? "");
            await copyFinalDist(id ?? "");
            updateStatus(id ?? "", "deployed");

        } else {
            await client.send(
            new DeleteMessageBatchCommand({
                QueueUrl: queueUrl,
                Entries: Messages.map((message) => ({
                Id: message.MessageId,
                ReceiptHandle: message.ReceiptHandle,
                })),
            }),
            );
        }
    }
};

main()
