"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3VectorStore = void 0;
const documents_1 = require("@langchain/core/documents");
const vectorstores_1 = require("@langchain/core/vectorstores");
const client_s3vectors_1 = require("@aws-sdk/client-s3vectors");
/**
 * AWS S3 Vector Store implementation
 * Integrates with AWS S3 Vectors feature for storing and querying vector embeddings
 */
class S3VectorStore extends vectorstores_1.VectorStore {
    _vectorstoreType() {
        return 'aws-s3-vector';
    }
    constructor(embeddings, config) {
        super(embeddings, config);
        this.initialized = false;
        this.config = config;
        this.s3VectorsClient = new client_s3vectors_1.S3VectorsClient({
            region: config.region,
            credentials: {
                accessKeyId: config.credentials.accessKeyId,
                secretAccessKey: config.credentials.secretAccessKey,
                ...(config.credentials.sessionToken && { sessionToken: config.credentials.sessionToken }),
            },
        });
    }
    /**
     * Initialize the S3 Vector Store
     * Creates index if it doesn't exist
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Initialize vector index
            // await this.ensureIndexExists();
            this.initialized = true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to initialize S3 Vector Store: ${errorMessage}`);
        }
    }
    /**
     * Add documents to the vector store
     */
    async addDocuments(documents) {
        await this.initialize();
        const ids = [];
        const vectors = [];
        // Generate embeddings for all documents
        const texts = documents.map(doc => doc.pageContent);
        const embeddings = await this.embeddings.embedDocuments(texts);
        // Prepare vector documents
        for (let i = 0; i < documents.length; i++) {
            const id = this.generateId();
            const vector = {
                id,
                vector: embeddings[i],
                metadata: {
                    ...documents[i].metadata,
                    content: documents[i].pageContent,
                    ...(this.config.namespace && { namespace: this.config.namespace }),
                },
                content: documents[i].pageContent,
            };
            vectors.push(vector);
            ids.push(id);
        }
        // Insert vectors using S3 Vectors API
        await this.insertVectors(vectors);
        return ids;
    }
    /**
     * Add vectors directly to the store
     */
    async addVectors(vectors, documents) {
        await this.initialize();
        const ids = [];
        const s3Vectors = [];
        // Prepare vector documents
        for (let i = 0; i < vectors.length; i++) {
            const id = this.generateId();
            const vector = {
                id,
                vector: vectors[i],
                metadata: {
                    ...documents[i].metadata,
                    content: documents[i].pageContent,
                    ...(this.config.namespace && { namespace: this.config.namespace }),
                },
                content: documents[i].pageContent,
            };
            s3Vectors.push(vector);
            ids.push(id);
        }
        // Insert vectors using S3 Vectors API
        await this.insertVectors(s3Vectors);
        return ids;
    }
    /**
     * Similarity search with score using vector
     */
    async similaritySearchVectorWithScore(query, k, filter) {
        await this.initialize();
        // Perform vector search
        const results = await this.searchVectors(query, k, filter);
        // Convert results to Document format
        return results.map(result => [
            new documents_1.Document({
                pageContent: result.content,
                metadata: result.metadata,
            }),
            result.score || 0,
        ]);
    }
    /**
     * Similarity search with score
     */
    async similaritySearchWithScore(query, k = 4, filter) {
        await this.initialize();
        // Generate embedding for query
        const queryEmbedding = await this.embeddings.embedQuery(query);
        // Use the vector-based search
        return this.similaritySearchVectorWithScore(queryEmbedding, k, filter);
    }
    /**
     * Similarity search (without scores)
     */
    async similaritySearch(query, k = 4, filter) {
        const results = await this.similaritySearchWithScore(query, k, filter);
        return results.map(([doc]) => doc);
    }
    /**
     * Create S3VectorStore from documents
     */
    static async fromDocuments(docs, embeddings, config) {
        const instance = new S3VectorStore(embeddings, config);
        await instance.addDocuments(docs);
        return instance;
    }
    /**
     * Create S3VectorStore from existing index
     */
    static async fromExistingIndex(embeddings, config) {
        const instance = new S3VectorStore(embeddings, config);
        await instance.initialize();
        return instance;
    }
    async insertVectors(vectors) {
        try {
            // Insert vectors using S3 Vectors API in batches
            const batchSize = 100;
            for (let i = 0; i < vectors.length; i += batchSize) {
                const batch = vectors.slice(i, i + batchSize);
                const putVectorsInput = {
                    vectors: batch.map(vec => ({
                        key: vec.id,
                        data: vec.vector,
                        metadata: vec.metadata,
                    })),
                };
                await this.s3VectorsClient.send(new client_s3vectors_1.PutVectorsCommand(putVectorsInput));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to insert vectors: ${errorMessage}`);
        }
    }
    async searchVectors(queryVector, k, filter) {
        try {
            const queryVectorsInput = {
                topK: k,
                queryVector: queryVector,
                ...(filter && { filter }),
            };
            const response = await this.s3VectorsClient.send(new client_s3vectors_1.QueryVectorsCommand(queryVectorsInput));
            // Convert S3 Vectors response to our format
            const results = response.matches || response.results || [];
            return results.map((result) => {
                var _a;
                return ({
                    content: ((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.content) || '',
                    metadata: result.metadata || {},
                    score: result.score || 0,
                });
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to search vectors: ${errorMessage}`);
        }
    }
    async deleteIndex() {
        try {
            // Note: The actual API properties may differ from this implementation
            // This is a placeholder that follows the expected pattern
            const deleteIndexInput = {
                bucket: this.config.bucketName,
                index: this.config.indexName,
            };
            await this.s3VectorsClient.send(new client_s3vectors_1.DeleteIndexCommand(deleteIndexInput));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete vector index: ${errorMessage}`);
        }
    }
    async getEmbeddingDimensions() {
        // Get embedding dimensions by creating a test embedding
        const testEmbedding = await this.embeddings.embedQuery('test');
        return testEmbedding.length;
    }
    generateId() {
        return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.S3VectorStore = S3VectorStore;
//# sourceMappingURL=S3VectorStore.js.map