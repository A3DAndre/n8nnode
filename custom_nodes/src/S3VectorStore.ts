import { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { 
	S3VectorsClient, 
	CreateIndexCommand, 
	PutVectorsCommand, 
	QueryVectorsCommand,
	DeleteIndexCommand,
	type CreateIndexCommandInput,
	type PutVectorsCommandInput,
	type QueryVectorsCommandInput
} from '@aws-sdk/client-s3vectors';

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
export class S3VectorStore extends VectorStore {
	_vectorstoreType(): string {
		return 'aws-s3-vector';
	}

	private s3VectorsClient: S3VectorsClient;
	private config: S3VectorStoreConfig;
	private initialized = false;

	constructor(embeddings: Embeddings, config: S3VectorStoreConfig) {
		super(embeddings, config);
		this.config = config;
		this.s3VectorsClient = new S3VectorsClient({
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
	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			// Initialize vector index
			await this.ensureIndexExists();
			
			this.initialized = true;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to initialize S3 Vector Store: ${errorMessage}`);
		}
	}

	/**
	 * Add documents to the vector store
	 */
	async addDocuments(documents: Document[]): Promise<string[]> {
		await this.initialize();

		const ids: string[] = [];
		const vectors: S3VectorDocument[] = [];

		// Generate embeddings for all documents
		const texts = documents.map(doc => doc.pageContent);
		const embeddings = await this.embeddings.embedDocuments(texts);

		// Prepare vector documents
		for (let i = 0; i < documents.length; i++) {
			const id = this.generateId();
			const vector: S3VectorDocument = {
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
	async addVectors(vectors: number[][], documents: Document[]): Promise<string[]> {
		await this.initialize();

		const ids: string[] = [];
		const s3Vectors: S3VectorDocument[] = [];

		// Prepare vector documents
		for (let i = 0; i < vectors.length; i++) {
			const id = this.generateId();
			const vector: S3VectorDocument = {
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
	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: Record<string, any>
	): Promise<[Document, number][]> {
		await this.initialize();

		// Perform vector search
		const results = await this.searchVectors(query, k, filter);

		// Convert results to Document format
		return results.map(result => [
			new Document({
				pageContent: result.content,
				metadata: result.metadata,
			}),
			result.score || 0,
		]);
	}

	/**
	 * Similarity search with score
	 */
	async similaritySearchWithScore(
		query: string,
		k = 4,
		filter?: Record<string, any>
	): Promise<[Document, number][]> {
		await this.initialize();

		// Generate embedding for query
		const queryEmbedding = await this.embeddings.embedQuery(query);

		// Use the vector-based search
		return this.similaritySearchVectorWithScore(queryEmbedding, k, filter);
	}

	/**
	 * Similarity search (without scores)
	 */
	async similaritySearch(
		query: string,
		k = 4,
		filter?: Record<string, any>
	): Promise<Document[]> {
		const results = await this.similaritySearchWithScore(query, k, filter);
		return results.map(([doc]) => doc);
	}

	/**
	 * Clear the entire index
	 */
	async clearIndex(): Promise<void> {
		await this.initialize();

		try {
			// Use S3 Vectors API to clear the index
			await this.deleteIndex();
			await this.ensureIndexExists();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to clear S3 Vector index: ${errorMessage}`);
		}
	}

	/**
	 * Create S3VectorStore from documents
	 */
	static async fromDocuments(
		docs: Document[],
		embeddings: Embeddings,
		config: S3VectorStoreConfig
	): Promise<S3VectorStore> {
		const instance = new S3VectorStore(embeddings, config);
		await instance.addDocuments(docs);
		return instance;
	}

	/**
	 * Create S3VectorStore from existing index
	 */
	static async fromExistingIndex(
		embeddings: Embeddings,
		config: S3VectorStoreConfig
	): Promise<S3VectorStore> {
		const instance = new S3VectorStore(embeddings, config);
		await instance.initialize();
		return instance;
	}

	/**
	 * Private helper methods
	 */

	private async ensureIndexExists(): Promise<void> {
		try {
			// Try to create the index using S3 Vectors API
			const dimensions = await this.getEmbeddingDimensions();
			
			const createIndexInput: CreateIndexCommandInput = {
				indexName: this.config.indexName,
				dataType: 'float32',
				dimension: dimensions,
				distanceMetric: 'cosine',
			};

			await this.s3VectorsClient.send(new CreateIndexCommand(createIndexInput));
		} catch (error) {
			// If index already exists, that's fine
			if ((error as any).name === 'ResourceAlreadyExistsException' || 
				(error as any).name === 'ConflictException' ||
				(error as any).message?.includes('already exists')) {
				// Index already exists, which is fine
				return;
			}
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to ensure vector index exists: ${errorMessage}`);
		}
	}

	private async insertVectors(vectors: S3VectorDocument[]): Promise<void> {
		try {
			// Insert vectors using S3 Vectors API in batches
			const batchSize = 100;
			for (let i = 0; i < vectors.length; i += batchSize) {
				const batch = vectors.slice(i, i + batchSize);
				
				const putVectorsInput: PutVectorsCommandInput = {
					vectors: batch.map(vec => ({
						key: vec.id,
						data: vec.vector as any,
						metadata: vec.metadata,
					})),
				};

				await this.s3VectorsClient.send(new PutVectorsCommand(putVectorsInput));
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to insert vectors: ${errorMessage}`);
		}
	}

	private async searchVectors(
		queryVector: number[],
		k: number,
		filter?: Record<string, any>
	): Promise<Array<{ content: string; metadata: Record<string, any>; score?: number }>> {
		try {
			const queryVectorsInput: QueryVectorsCommandInput = {
				topK: k,
				queryVector: queryVector as any,
				...(filter && { filter }),
			};

			const response = await this.s3VectorsClient.send(new QueryVectorsCommand(queryVectorsInput));
			
			// Convert S3 Vectors response to our format
			const results = (response as any).matches || (response as any).results || [];
			return results.map((result: any) => ({
				content: result.metadata?.content || '',
				metadata: result.metadata || {},
				score: result.score || 0,
			}));
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to search vectors: ${errorMessage}`);
		}
	}

	private async deleteIndex(): Promise<void> {
		try {
			// Note: The actual API properties may differ from this implementation
			// This is a placeholder that follows the expected pattern
			const deleteIndexInput = {
				bucket: this.config.bucketName,
				index: this.config.indexName,
			} as any;

			await this.s3VectorsClient.send(new DeleteIndexCommand(deleteIndexInput));
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to delete vector index: ${errorMessage}`);
		}
	}

	private async getEmbeddingDimensions(): Promise<number> {
		// Get embedding dimensions by creating a test embedding
		const testEmbedding = await this.embeddings.embedQuery('test');
		return testEmbedding.length;
	}

	private generateId(): string {
		return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}
