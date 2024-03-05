import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);

import {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { removeOutputs } from "./utils";

const s3Client = new S3Client({});

export async function downloadS3Folder(prefix: string) {
    const command = new ListObjectsV2Command({
        Bucket: "juscel",
        Prefix: prefix,
    });

    try {
        let isTruncated = true;
        while (isTruncated) {
            const { Contents, IsTruncated, NextContinuationToken } = await s3Client.send(command);
            // @ts-ignore
            const contentsList = Contents?.map((async ({Key}) => {
                return new Promise(async (resolve) => {
                    if (!Key) {
                        resolve("");
                        return;
                    }
                    const finalOutputPath = path.join(__dirname, "/" + Key);
                    const outputFile = fs.createWriteStream(finalOutputPath);
                    const dirName = path.dirname(finalOutputPath);

                    if (!fs.existsSync(dirName)) {
                        fs.mkdirSync(dirName, { recursive: true });
                    }

                    const downloadCommand = new GetObjectCommand({
                        Bucket: "juscel",
                        Key: Key,
                    });

                    s3Client.send(downloadCommand).then((data) => {
                        // @ts-ignore
                        data.Body?.pipe(outputFile).on("finish", () => {
                            resolve("")
                        });
                    });
                });
            })) || [];
            isTruncated = IsTruncated as any;
            command.input.ContinuationToken = NextContinuationToken;

            await Promise.all(contentsList?.filter(x => x !== undefined))
            console.log("Finsihed downloading")
        }
        // console.log(contents);
      } catch (err) {
        console.error(err);
      }
}

function getRightFolderPath (id: string){
    const distPath = path.join(__dirname, `output/${id}/dist`);
    const buildPath = path.join(__dirname, `output/${id}/build`);

    if (fs.existsSync(distPath)) {
        return distPath as string;
    } else if (fs.existsSync(buildPath)) {
        return buildPath as string;
    }
}

export function copyFinalDist(id: string) {

    const folderPath : any = getRightFolderPath(id);
    const allFiles = getAllFiles(folderPath);

    allFiles.forEach((file) => {
        uploadFile(`dist/${id}/`+ file.slice(folderPath.length + 1), file);
    })

    // removeOutputs(id);
}

const getAllFiles = (folderPath: string) => {
    let response: string[] = [];

    const allFilesAndFolders = fs.readdirSync(folderPath);allFilesAndFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);
        if (fs.statSync(fullFilePath).isDirectory()) {
            response = response.concat(getAllFiles(fullFilePath))
        } else {
            response.push(fullFilePath);
        }
    });
    return response;
}

export const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    const uploadCommand = new PutObjectCommand({
        Body: fileContent,
        Bucket: "juscel",
        Key: fileName,
    });
    
    try {
        const response = await s3Client.send(uploadCommand);
        console.log(response);
    } catch (err) {
        console.log(err);
    }
}

export const updateStatus = async (id: string, status: string) => {
    const command = new PutCommand({
        TableName: 'juscel',
        Item: {
            id: id,
            status: status
        }
    });

    const response = await docClient.send(command);
    console.log(response);
};