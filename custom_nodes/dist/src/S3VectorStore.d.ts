import { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
export interface S3VectorStoreConfig {
    bucketName: string;
    indexName: string;
    region: string;
    namespace?: string;
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
    };
    filter?: Record<string, any>;
}
export interface S3VectorDocument {
    id: string;
    vector: number[];
    metadata: Record<string, any>;
    content: string;
}
/**
 * AWS S3 Vector Store implementation
 * Integrates with AWS S3 Vectors feature for storing and querying vector embeddings
 */
export declare class S3VectorStore extends VectorStore {
    _vectorstoreType(): string;
    private s3VectorsClient;
    private config;
    private initialized;
    constructor(embeddings: Embeddings, config: S3VectorStoreConfig);
    /**
     * Initialize the S3 Vector Store
     * Creates index if it doesn't exist
     */
    initialize(): Promise<void>;
    /**
     * Add documents to the vector store
     */
    addDocuments(documents: Document[]): Promise<string[]>;
    /**
     * Add vectors directly to the store
     */
    addVectors(vectors: number[][], documents: Document[]): Promise<string[]>;
    /**
     * Similarity search with score using vector
     */
    similaritySearchVectorWithScore(query: number[], k: number, filter?: Record<string, any>): Promise<[Document, number][]>;
    /**
     * Similarity search with score
     */
    similaritySearchWithScore(query: string, k?: number, filter?: Record<string, any>): Promise<[Document, number][]>;
    /**
     * Similarity search (without scores)
     */
    similaritySearch(query: string, k?: number, filter?: Record<string, any>): Promise<Document[]>;
    /**
     * Create S3VectorStore from documents
     */
    static fromDocuments(docs: Document[], embeddings: Embeddings, config: S3VectorStoreConfig): Promise<S3VectorStore>;
    /**
     * Create S3VectorStore from existing index
     */
    static fromExistingIndex(embeddings: Embeddings, config: S3VectorStoreConfig): Promise<S3VectorStore>;
    private insertVectors;
    private searchVectors;
    private deleteIndex;
    private getEmbeddingDimensions;
    private generateId;
}
//# sourceMappingURL=S3VectorStore.d.ts.map