import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
/**
 * Simple S3 Vector Node - Everything in one file
 * Based on the Python example for AWS S3 Vectors
 */
export declare class S3Vector implements INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
//# sourceMappingURL=S3Vector.node.d.ts.map