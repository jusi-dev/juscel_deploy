require('dotenv').config()

import {
    ReceiveMessageCommand,
    DeleteMessageCommand,
    SQSClient,
    DeleteMessageBatchCommand,
  } from "@aws-sdk/client-sqs";


import { copyFinalDist, downloadS3Folder, updateStatus, getBuildInfos } from "./aws";
import { buildProject, removeOutputs } from "./utils";

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
        try {
            const { Messages } = await receiveMessage(queueUrl);

            if (!Messages) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
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
                const buildInfos = await getBuildInfos(id ?? "")
                const { buildCommand, installCommand } = buildInfos as any;
                updateStatus(id ?? "", "Building Project...");
                await downloadS3Folder(`output/${id}`)
                const buildCode = await buildProject(id ?? "", buildCommand, installCommand);
                if (buildCode === 0) {
                    await copyFinalDist(id ?? "");
                    updateStatus(id ?? "", "deployed");
                } else {
                    updateStatus(id ?? "", `Build failed. Error code (${buildCode})`)
                }


                // TODO: Activate it again after testing
                // await removeOutputs(id ?? "");

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
            
        } catch (err) {
            console.error('An error occurred:', err);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

main()
