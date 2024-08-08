import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import type { RequestHandler } from '@sveltejs/kit';
import type { Db, Collection, WithId, Document } from 'mongodb';

dotenv.config();

const MONGO_URL: string = process.env.MONGO_URL ?? '';

if (!MONGO_URL?.length) {
	throw new Error('Missing required MONGO_URL environment variable.');
}

export const GET: RequestHandler = async (): Promise<Response> => {
	try {
		const client: MongoClient = new MongoClient(MONGO_URL);
		await client.connect();
		const db: Db = client.db('twitch_hype_bot');
		const collection: Collection = db.collection('hype_stats');

		// Calculate the start of the current day
		const startOfDay: Date = new Date();
		startOfDay.setHours(0, 0, 0, 0);

		// Fetch documents with timestamp greater than or equal to the start of the current day
		const data: WithId<Document>[] = await collection.find({
			timestamp: { $gte: startOfDay }
		}).sort({ timestamp: 1 }).toArray();
		await client.close();

		return new Response(JSON.stringify(data), { status: 200 });
	} catch (error) {
		console.error('Failed to fetch hype stats:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch hype stats' }), { status: 500 });
	}
};
