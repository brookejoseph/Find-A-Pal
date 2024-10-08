import { mutation, query, action, internalMutation, internalQuery, internalAction } from './_generated/server';
import { v} from 'convex/values';
//import { getAppIdea } from './openai/gpt';
import { internal } from './_generated/api';
import { Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
import {getEmbeddings, getEmbeddingsText} from './openai/clip';
import {generateTopicIdea} from './openai/gpt';
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useAction } from "convex/react";
import {InsertEmbed, grabEmbedding} from './pinecone/test';
import {generateRelevantTags} from './openai/gpt';

interface QueryData {
  textEmbedding: any;
  imageEmbedding: any;
}

interface PineconeData {
  results: any;
  matches: [
    {
      id: string;
      score: number;
      value: any;
    }
  ];
  namespace: any;
  usage: any;
}




function weightedAverageEmbedding(textEmbedding: any, imageEmbedding: any, textWeight: number, imageWeight: number): any {
  if (!imageEmbedding) {
    return textEmbedding.map((value: any) => value * textWeight);
  }

  const totalWeight = textWeight + imageWeight;
  const normalizedTextWeight = textWeight / totalWeight;
  const normalizedImageWeight = imageWeight / totalWeight;

  return textEmbedding.map((value: any, index: any) => normalizedTextWeight * value + normalizedImageWeight * imageEmbedding[index]);
}


export const returnRelevantUsers = action({
  args: {
    textQuery: v.any(),
    imageQuery: v.any(),
  },
  handler: async (ctx, args) => {
    let newEmbed;
    if (args.imageQuery) {
      newEmbed = weightedAverageEmbedding(args.textQuery, args.imageQuery, 0.4, 0.6);
    } else {
      newEmbed = weightedAverageEmbedding(args.textQuery, args.imageQuery, 1.0, 0.0);
    }
    
    const pineconeResults: any = await ctx.runAction(internal.ideas.grabIdFromPineconeInternal, { queryEmbed: newEmbed });
    console.log("pineconeResults", pineconeResults);
    const mostRelevantPerson: any = await ctx.runQuery(internal.ideas.idToTName, { id: pineconeResults.matches[0].id });
    return mostRelevantPerson;
  },
});


export const grabIdFromPineconeInternal = internalAction({
  args: {
    queryEmbed: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("args within the grabIdFromPinecone", args)
    const response = await grabEmbedding(args.queryEmbed);
    console.log("response within the grabIdFromPinecone", response)
    return response;
  },
});


export const produceRelevantTags = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const tags = await generateRelevantTags(args.query);
    return tags;
  },
});



export const handlePineconeResults = action({
  args: {
    queryEmbed: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("args within the handlePineconeResults", args)
    const response = await grabEmbedding(args.queryEmbed);
    console.log("response within the handlePineconeResults", response)
    return response;
  },
});

export const grabIdFromPinecone = action({
  args: {
    queryEmbed: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("args within the grabIdFromPinecone", args)
    const response = await grabEmbedding(args.queryEmbed);
    console.log("response within the grabIdFromPinecone", response)
    return response;
  },
});


export const storeImageEmbeddingPinecone = action({
  args: {
    id: v.string(),
    embedding: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("args", args)
    await InsertEmbed(args.embedding, args.id);
  },
});


export const handleSearch = action({
  args: {
    query: v.any(),
  },
  handler: async (ctx, args)=> {
    console.log("args within the hanldesearch", args)
    const searchResults = await ctx.vectorSearch("Categories", "by_embedding", {
      vector: args.query,
      limit: 3,
    });
    
    console.log("searchResults", searchResults);
    const topics: number[][] = [];
    const topicNames: string[] = [];
    for (const result of searchResults) {
      const topicName = await ctx.runQuery(internal.ideas.idToTopics, {id: result._id});
      if (topicName) {
        topics.push(topicName?.embedding ?? []);
        topicNames.push(topicName?.topic ?? "");
      }
    }
    
    const vectorLength = topics[0].length;
    const averageVector = topics.reduce((acc, vector) => {
      return acc.map((sum: any, i: any) => sum + vector[i]);
    }, Array(vectorLength).fill(0)).map(sum => sum / 768);

    console.log("Average vector:", averageVector);

    return {
      averageVector,
      topicNames,
    };
  },
});

export const grabMostRelevantPerson =action({
  args: {
    id: v.string(),
    query: v.any(),
  },
  handler: async (ctx, args)=> {
    const searchResults = await ctx.vectorSearch("Image", "by_embedding", {
      vector: args.query,
      limit: 2,
    });
    console.log("searchResults with in most relevant person", searchResults);

    for (const result of searchResults) {
      if(result._id !== args.id){
        const name: any = await ctx.runQuery(internal.ideas.idToTName, {id: result._id})
        return {name: name, score: result._score};
      }
    }
  },
});


export const handleQuery = action({
  args: {
    query: v.any(),
  },
  handler: async (ctx, args)=> {
    const searchResults = await ctx.vectorSearch("Image", "by_embedding", {
      vector: args.query,
      limit: 5,
    });
    console.log("searchResults with in most relevant person", searchResults);
    let names: any[] = [];
    for (const result of searchResults) {
      const name: any = await ctx.runQuery(internal.ideas.idToTName, {id: result._id})
      const score: any = result._score;
      names.push({name: name, score: score});
    }
    return names;
  },
});

export const idToTopics = internalQuery({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args)=> {
    const topic = await ctx.db.normalizeId("Categories", args.id);
    if (!topic) return null;
    const topics = await ctx.db.get(topic);
    const topicName = topics?.embedding;
    const topicName2 = topics?.topic;
    return {embedding: topicName, topic: topicName2};
  },
});

export const idToTName = internalQuery({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args)=> {
    const topic = await ctx.db.normalizeId("Image", args.id);
    if (!topic) return null;
    const topics = await ctx.db.get(topic);
    const topicName = topics?.name;
    return topicName;
  },
});


export const generateEmbeddings = action({
    args: {
      prompt: v.string(),
    },
    handler: async (ctx, args) => {
      console.log("args", args)
      const embeddings = await getEmbeddings(args.prompt);
      return embeddings;
    },
  });


  export const generateEmbeddingsText = action({
    args: {
      prompt: v.string(),
    },
    handler: async (ctx, args) => {
      console.log("args", args)
      const embeddings = getEmbeddingsText(args.prompt);
      return embeddings;
    },
  });


  export const storeinfo = mutation({
    args: {
      name: v.string(),
      embedding: v.any(),
      top3: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
      const { name, embedding, top3 } = args;
      const id = await ctx.db.insert("Image", { name, embedding, top3 });      
      console.log("Upsert to Pinecone successful");
      return id;
    },
  });

  export const generateTopicIdea2 = action({
    handler: async (ctx) => {
      const idea = generateTopicIdea();
      return idea;
    },
  });


/*



export const generateTopicIdea2 = action({
  handler: async (ctx) => {
    const idea = generateTopicIdea();
    return idea;
  },
});

export const storeTopicAndEmbedding = mutation({
  args: {
    topic: v.string(),
    embedding: v.any(),
  },
  handler: async (ctx, args) => {
    const { topic, embedding } = args;
    await ctx.db.insert("Categories", { topic, embedding });
  },
});




  export const storeResult = internalMutation({
    args: {
      storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
      const { storageId } = args;
        await ctx.db.insert("Image", { 
          imageUrl: storageId,
          embedding: [],
      });
    },
  });
  
  export const storeImageToFiles = action({
   handler: async (ctx) => {
    const generateUrl = await ctx.runMutation(internal.ideas.generateUploadUrl, {});
    const response = await fetch(generateUrl, {
      method: "PUT",
      body: generateUrl,
    });
      const blob = await response.blob();
  
      const storageId: Id<"_storage"> = await ctx.storage.store(blob);
      
  
      await ctx.runMutation(internal.ideas.storeResult, {
        storageId,
      });
  
      const URL = await ctx.storage.getUrl(storageId);
      return {URL: URL, storageId: storageId};
    },
  });

export const generateUploadUrl = internalMutation(async (ctx) => {
    const url = await ctx.storage.generateUploadUrl()
    return url
  });*/

  /*
  export const storeResult = internalMutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { storageId } = args;
    const imageUrl = await ctx.storage.getUrl(storageId); // Get the URL here

    await ctx.db.insert("Image", { 
      imageUrl: imageUrl ?? '', // Store the URL in the database
      embedding: [],
    });
  },
});

export const storeImageToFiles = action({
  handler: async (ctx) => {
    const generateUrl = await ctx.runMutation(internal.ideas.generateUploadUrl, {});
    
    const response = await fetch(generateUrl, {
      method: "PUT",
      body: generateUrl, // This should be the actual file, not the URL itself
    });
    const blob = await response.blob();
    const storageId = await ctx.storage.store(blob); // Store the file directly
  
    await ctx.runMutation(internal.ideas.storeResult, {
      storageId,
    });
  
    const URL = await ctx.storage.getUrl(storageId); // Get the URL of the stored image
    return { URL, storageId };
  },
});

export const generateUploadUrl = internalMutation(async (ctx) => {
  const url = await ctx.storage.generateUploadUrl();
  return url;
});
  */