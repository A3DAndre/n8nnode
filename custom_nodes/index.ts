import { INodeType } from 'n8n-workflow';
import { VectorStoreAwsS3 } from './src/VectorStoreAwsS3.node';

export const nodeTypes: INodeType[] = [
	new VectorStoreAwsS3(),
];
