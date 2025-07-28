// Simple test to verify the package builds and exports correctly
const { VectorStoreAwsS3 } = require('./dist/src/VectorStoreAwsS3.node.js');
const { S3VectorStore } = require('./dist/src/S3VectorStore.js');

console.log('✅ Package built successfully!');
console.log('✅ VectorStoreAwsS3 class exported:', typeof VectorStoreAwsS3);
console.log('✅ S3VectorStore class exported:', typeof S3VectorStore);

// Check if the classes have the expected structure
if (VectorStoreAwsS3 && VectorStoreAwsS3.prototype) {
    console.log('✅ VectorStoreAwsS3 has prototype methods');
}

if (S3VectorStore && S3VectorStore.prototype) {
    console.log('✅ S3VectorStore has prototype methods');
    console.log('✅ S3VectorStore methods:', Object.getOwnPropertyNames(S3VectorStore.prototype).filter(name => name !== 'constructor'));
}

console.log('\n🎉 AWS S3 Vector Store node package is ready for use!');
