import { INodeType } from 'n8n-workflow';
import { S3Vector } from './src/S3Vector.node';

export const nodeTypes: INodeType[] = [
	new S3Vector(),
];
