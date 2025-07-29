"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Vector = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const aws_1 = require("@langchain/aws");
const client_s3vectors_1 = require("@aws-sdk/client-s3vectors");
const textsplitters_1 = require("@langchain/textsplitters");
/**
 * Simple S3 Vector Node - Everything in one file
 * Based on the Python example for AWS S3 Vectors
 */
class S3Vector {
    constructor() {
        this.description = {
            displayName: 'S3 Vector',
            name: 's3Vector',
            group: ['transform'],
            version: 1,
            description: 'Simple S3 Vector operations - insert and search',
            defaults: {
                name: 'S3 Vector',
                color: '#FF9900',
            },
            inputs: [{ displayName: '', type: 'main' }],
            outputs: [{ displayName: '', type: 'main' }],
            credentials: [
                {
                    name: 'aws',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    default: 'insert',
                    options: [
                        {
                            name: 'Insert Documents',
                            value: 'insert',
                            description: 'Insert documents into S3 Vector store',
                        },
                        {
                            name: 'Search Documents',
                            value: 'search',
                            description: 'Search for similar documents',
                        },
                    ],
                },
                // S3 Configuration
                {
                    displayName: 'Bucket Name',
                    name: 'bucketName',
                    type: 'string',
                    default: 'processed-documents',
                    required: true,
                    description: 'S3 bucket name for vector storage',
                },
                {
                    displayName: 'Index Name',
                    name: 'indexName',
                    type: 'string',
                    required: true,
                    default: 'aws',
                    description: 'Vector index name',
                },
                {
                    displayName: 'Region',
                    name: 'region',
                    type: 'string',
                    required: true,
                    default: 'us-east-2',
                    description: 'AWS region',
                },
                // Embedding Configuration
                {
                    displayName: 'Embedding Model',
                    name: 'embeddingModel',
                    type: 'string',
                    required: true,
                    default: 'amazon.titan-embed-text-v2:0',
                    description: 'Bedrock embedding model ID',
                },
                {
                    displayName: 'Embedding Dimensions',
                    name: 'embeddingDimensions',
                    type: 'number',
                    default: 1536,
                    description: 'Number of embedding dimensions',
                },
                {
                    displayName: 'Data',
                    name: 'data',
                    type: 'string',
                    required: true,
                    default: 'text',
                    description: 'Field containing text to process for embedding',
                },
                {
                    displayName: 'Key',
                    name: 'key',
                    type: 'string',
                    default: '',
                    description: 'Unique key for the document',
                    displayOptions: {
                        show: {
                            operation: ['insert'],
                        },
                    },
                },
                {
                    displayName: 'Limit',
                    name: 'limit',
                    type: 'number',
                    default: 4,
                    description: 'Number of results to return',
                    displayOptions: {
                        show: {
                            operation: ['search'],
                        },
                    },
                },
            ],
        };
    }
    async execute() {
        const operation = this.getNodeParameter('operation', 0);
        console.log(`[S3Vector] Starting ${operation} operation `);
        switch (operation) {
            case 'insert':
                {
                    try {
                        return await executeS3VectorInsert(this);
                    }
                    catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        console.error(`[S3Vector] Error during insert operation: ${errorMsg}`);
                    }
                    break;
                }
            case 'search':
                {
                    try {
                        return await executeS3VectorSearch(this);
                    }
                    catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        console.error(`[S3Vector] Error during search operation: ${errorMsg}`);
                    }
                    break;
                }
            default:
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
        }
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
    }
}
exports.S3Vector = S3Vector;
async function setup_aws(n8n_node, i = 0) {
    // Get parameters
    const bucketName = n8n_node.getNodeParameter('bucketName', i);
    const indexName = n8n_node.getNodeParameter('indexName', i);
    const region = n8n_node.getNodeParameter('region', i);
    const embeddingModel = n8n_node.getNodeParameter('embeddingModel', i);
    const embeddingDimensions = n8n_node.getNodeParameter('embeddingDimensions', i);
    console.log(`[S3Vector] Config - Bucket: ${bucketName}, Index: ${indexName}, Region: ${region}`);
    const credentials = await n8n_node.getCredentials('aws');
    // Create Bedrock embeddings instance
    const bedrock_embedding = new aws_1.BedrockEmbeddings({
        model: embeddingModel,
        region,
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
        },
    });
    // Create S3 Vectors client
    const s3_vector = new client_s3vectors_1.S3VectorsClient({
        region,
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
        },
    });
    return {
        insert_data: async ({ key, text }, metadata) => {
            const chunks = await generateChunks(text);
            const embeddings = await bedrock_embedding.embedDocuments(chunks);
            console.log(`[S3Vector] Generated ${embeddings.length} embeddings for ${chunks.length} chunks`);
            const vectors = chunks.map((chunk, index) => ({
                key: `${key}_chunk_${index}`,
                data: {
                    float32: embeddings[index],
                },
                metadata: {
                    parent_key: key,
                    text: chunk,
                    ...metadata,
                },
            }));
            console.log(`[S3Vector] Inserting ${vectors.length} vectors into S3`);
            const resp = await s3_vector.send(new client_s3vectors_1.PutVectorsCommand({
                indexName: indexName,
                vectorBucketName: bucketName,
                vectors
            }));
            console.log(`[S3Vector] Inserted vector ${key} into bucket ${bucketName}, index ${indexName}`);
            return resp;
        },
        search_vectors: async (query, limit = 4) => {
            console.log(`[S3Vector] Searching for: "${query}", limit: ${limit}`);
            const queryEmbedding = await bedrock_embedding.embedQuery(query);
            console.log(`[S3Vector] Generated query embedding with ${queryEmbedding.length} dimensions`);
            const queryResponse = await s3_vector.send(new client_s3vectors_1.QueryVectorsCommand({
                queryVector: {
                    float32: queryEmbedding
                },
                topK: limit,
                indexName: indexName,
                vectorBucketName: bucketName,
                returnMetadata: true,
            }));
            const searchResults = queryResponse.vectors || [];
            console.log(`[S3Vector] Found ${searchResults.length} results`);
            return searchResults;
        }
    };
}
async function generateChunks(text, chunkSize = 1000, chunkOverlap = 200) {
    const textSplitter = new textsplitters_1.RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });
    const chunks = await textSplitter.splitText(text);
    console.log(`[S3Vector] Generated ${chunks.length} chunks from text of length ${text.length}`);
    return chunks;
}
async function executeS3VectorInsert(n8n_node) {
    const aws = await setup_aws(n8n_node);
    const items = n8n_node.getInputData();
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        const text = n8n_node.getNodeParameter('data', i);
        const key = n8n_node.getNodeParameter('key', i);
        const metadata = items[i].json;
        try {
            const results = await aws.insert_data({ key, text }, metadata);
            returnData.push({
                json: {
                    success: true,
                    key,
                    text,
                    metadata,
                    results,
                },
            });
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            returnData.push({
                json: {
                    success: false,
                    error: errorMsg,
                },
            });
            if (!n8n_node.continueOnFail()) {
                throw new n8n_workflow_1.NodeOperationError(n8n_node.getNode(), errorMsg);
            }
            console.error(`[S3Vector] Error inserting data for item ${i + 1}:`, error);
        }
    }
    return [returnData];
}
async function executeS3VectorSearch(n8n_node) {
    const aws = await setup_aws(n8n_node);
    const items = n8n_node.getInputData();
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        const query = n8n_node.getNodeParameter('data', i);
        const limit = n8n_node.getNodeParameter('limit', i);
        try {
            const results = await aws.search_vectors(query, limit);
            returnData.push({
                json: {
                    success: true,
                    query,
                    results,
                },
            });
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            returnData.push({
                json: {
                    success: false,
                    error: errorMsg,
                },
            });
            if (!n8n_node.continueOnFail()) {
                throw new n8n_workflow_1.NodeOperationError(n8n_node.getNode(), errorMsg);
            }
        }
    }
    return [returnData];
}
//# sourceMappingURL=S3Vector.node.js.map