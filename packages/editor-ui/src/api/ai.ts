import type { IRestApiContext, Schema } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IDataObject } from 'n8n-workflow';

export async function generateCodeForPrompt(
	ctx: IRestApiContext,
	{
		question,
		context,
		model,
		n8nVersion,
	}: {
		question: string;
		context: {
			schema: Array<{ nodeName: string; schema: Schema }>;
			inputSchema: { nodeName: string; schema: Schema };
			pushRef: string;
			ndvPushRef: string;
		};
		model: string;
		n8nVersion: string;
	},
): Promise<{ code: string }> {
	return await makeRestApiRequest(ctx, 'POST', '/ask-ai', {
		question,
		context,
		model,
		n8nVersion,
	} as IDataObject);
}

export const initDebugSession = async (
	context: IRestApiContext,
	payload: any,
	onChunk: (chunk: string) => void,
): Promise<void> => {
	const headers = {
		'Content-Type': 'application/json',
	};
	const response = await fetch(`${context.baseUrl}/ai-proxy/v1/chat`, {
		headers,
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify(payload),
	});
	if (response.ok && response.body) {
		console.log('Response:', response);
		// Handle the streaming response
		const reader = response.body.getReader();
		const decoder = new TextDecoder('utf-8');

		async function readStream() {
			const { done, value } = await reader.read();
			if (done) {
				console.log('Stream finished');
				// waitingForResponse.value = false;
				return;
			}

			const chunk = decoder.decode(value);
			const splitChunks = chunk.split('\n');

			for (const splitChunk of splitChunks) {
				if (splitChunk) {
					onChunk(splitChunk);
				}
			}
			await readStream();
		}
		// Start reading the stream
		await readStream();
	} else {
		console.error('Error:', response.status);
	}
};
