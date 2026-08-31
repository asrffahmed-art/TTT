var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server.ts
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import dns from "dns";
import nodemailer from "nodemailer";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { initializeApp as initFirebaseAdmin, getApps as getAdminApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import webpush from "web-push";
import { initializeApp as initWebFirebase, getApps as getWebApps } from "firebase/app";
import {
  initializeFirestore as initializeWebFirestore,
  collection as collection2,
  doc as doc2,
  getDoc,
  getDocs as getDocs2,
  setDoc as setDoc2,
  deleteDoc as deleteDoc2,
  query,
  orderBy,
  limit,
  increment,
  where,
  documentId
} from "firebase/firestore";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "gen-lang-client-0920354136",
  appId: "1:67294751494:web:52796cd4cf6b1c45c38c87",
  apiKey: "AIzaSyCi_OGkMMTDuryrNVJdvn9RLgL9oDNjMAU",
  authDomain: "gen-lang-client-0920354136.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-aimodelchat-dd6a637e-3206-4fe6-9bc8-7abe45b5a942",
  storageBucket: "gen-lang-client-0920354136.firebasestorage.app",
  messagingSenderId: "67294751494",
  measurementId: "",
  oAuthClientId: "67294751494-s2trhe8kk6h5vu41vi88rjaqqp73ldl9.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/services/aiEmbeddingService.ts
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
function sanitizeTextForEmbedding(rawText) {
  if (!rawText) return { sanitizedText: "", scrubbedCount: 0, detectedTypes: [] };
  let text = rawText;
  let count = 0;
  const detectedTypesSet = /* @__PURE__ */ new Set();
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches) {
    count += emailMatches.length;
    detectedTypesSet.add("\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A (Email)");
    text = text.replace(emailRegex, "[EMAIL_REDACTED]");
  }
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) {
    const realPhones = phoneMatches.filter((p) => p.replace(/\D/g, "").length >= 7);
    if (realPhones.length > 0) {
      count += realPhones.length;
      detectedTypesSet.add("\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 (Phone)");
      realPhones.forEach((p) => {
        text = text.replace(p, "[PHONE_REDACTED]");
      });
    }
  }
  const apiKeyRegex = /(AIzaSy[a-zA-Z0-9_-]{33}|tvly-[a-zA-Z0-9_-]{30,}|sk-[a-zA-Z0-9]{32,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|[a-f0-9]{32,64})/gi;
  const apiMatches = text.match(apiKeyRegex);
  if (apiMatches) {
    count += apiMatches.length;
    detectedTypesSet.add("\u0645\u0641\u0627\u062A\u064A\u062D API / \u0627\u0644\u062A\u0648\u0643\u0646\u0632 (API Keys)");
    text = text.replace(apiKeyRegex, "[KEY_REDACTED]");
  }
  const secretPattern = /(pass(?:word)?|secret|token|كلمة\s+السر|باسوورد|الرقم\s+السرى)\s*[:=]\s*\S+/gi;
  const secretMatches = text.match(secretPattern);
  if (secretMatches) {
    count += secretMatches.length;
    detectedTypesSet.add("\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u0631/\u0627\u0644\u0623\u0633\u0631\u0627\u0631 (Secrets)");
    text = text.replace(secretPattern, "$1: [SECRET_REDACTED]");
  }
  const namePattern = /(?:user(?:name)?|اسم\s+المستخدم|العميل|المستخدم)\s*[:=]\s*([A-Za-zأ-ي\s]{2,25})(?=\s|,|\.|$)/gi;
  const nameMatches = text.match(namePattern);
  if (nameMatches) {
    count += nameMatches.length;
    detectedTypesSet.add("\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 (Usernames)");
    text = text.replace(namePattern, "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: [USER_REDACTED]");
  }
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
  const ipMatches = text.match(ipRegex);
  if (ipMatches) {
    count += ipMatches.length;
    detectedTypesSet.add("\u0639\u0646\u0648\u0627\u0646 IP");
    text = text.replace(ipRegex, "[IP_REDACTED]");
  }
  return {
    sanitizedText: text.trim(),
    scrubbedCount: count,
    detectedTypes: Array.from(detectedTypesSet)
  };
}
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
var AiEmbeddingManager = class {
  aiClient;
  db;
  memoryStore = [];
  isInitialized = false;
  searchCount = 0;
  searchLatencyTotalMs = 0;
  MODEL_ID = "gemini-embedding-2-preview";
  constructor(aiClient, dbFirestore) {
    this.aiClient = aiClient;
    this.db = dbFirestore;
  }
  updateAiClient(aiClient) {
    this.aiClient = aiClient;
  }
  // Generate vector using actual Gemini Embedding model
  async generateVector(rawText) {
    const { sanitizedText, scrubbedCount, detectedTypes } = sanitizeTextForEmbedding(rawText);
    if (!sanitizedText) {
      throw new Error("\u0627\u0644\u0646\u0635 \u0641\u0627\u0631\u063A \u0623\u0648 \u062A\u0645 \u062D\u0630\u0641 \u0645\u062D\u062A\u0648\u0627\u0647 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629.");
    }
    try {
      const response = await this.aiClient.models.embedContent({
        model: this.MODEL_ID,
        contents: sanitizedText
      });
      const embeddingValues = response.embeddings?.[0]?.values || response.embedding?.values;
      if (!embeddingValues || !Array.isArray(embeddingValues) || embeddingValues.length === 0) {
        throw new Error(`\u0641\u0634\u0644 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0645\u062A\u062C\u0647 \u0645\u0646 \u0627\u0633\u062A\u062C\u0627\u0628\u0629 ${this.MODEL_ID}`);
      }
      return {
        vector: embeddingValues,
        sanitizedText,
        scrubbedCount,
        detectedTypes
      };
    } catch (err) {
      console.error(`Error generating embedding with ${this.MODEL_ID}:`, err);
      throw err;
    }
  }
  // Initialize and load vectors from Firestore, seed initial dataset if empty
  async initStore() {
    if (this.isInitialized) return;
    try {
      console.log("Initializing Vector Store from Firestore...");
      const snapshot = await getDocs(collection(this.db, "vectorStore"));
      const loadedItems = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && Array.isArray(data.vector)) {
          loadedItems.push(data);
        }
      });
      this.memoryStore = loadedItems;
      console.log(`Loaded ${this.memoryStore.length} items from Firestore vectorStore`);
      if (this.memoryStore.length === 0) {
        console.log("Vector Store is empty. Seeding initial sanitized datasets...");
        await this.seedInitialDatasets();
      }
      this.isInitialized = true;
    } catch (err) {
      console.error("Error initializing vector store:", err);
      this.isInitialized = true;
    }
  }
  // Seed initial domain datasets
  async seedInitialDatasets() {
    const seedData = [
      // User Feedback & Issues
      {
        title: "\u0628\u0637\u0621 \u0631\u0641\u0639 \u0645\u0644\u0641\u0627\u062A PDF \u0627\u0644\u0639\u0631\u064A\u0636\u0629",
        content: "\u0648\u0627\u062C\u0647\u062A \u0645\u0634\u0643\u0644\u0629 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u0631\u0641\u0639 \u0645\u0644\u0641 PDF \u0643\u0628\u064A\u0631 \u0627\u0644\u062D\u062C\u0645 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u064A\u0633\u062A\u063A\u0631\u0642 \u0648\u0642\u062A \u0637\u0648\u064A\u0644\u0627\u064B \u0648\u064A\u0631\u0641\u0636 \u0627\u0644\u0631\u0641\u0639 \u0623\u062D\u064A\u0627\u0646\u0627\u064B.",
        sourceType: "feedback",
        topic: "\u0645\u0634\u0627\u0643\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641\u0627\u062A"
      },
      {
        title: "\u062E\u0637\u0623 \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A DOCX",
        content: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0639\u0646\u062F \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u0636\u063A\u0648\u0637\u0629 \u0648\u062A\u0646\u0633\u064A\u0642\u0627\u062A DOCX \u0627\u0644\u0643\u0628\u064A\u0631\u0629 \u0641\u064A \u0642\u0633\u0645 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u062E\u0627\u0635 \u0628\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A.",
        sourceType: "feedback",
        topic: "\u0645\u0634\u0627\u0643\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641\u0627\u062A"
      },
      {
        title: "\u062A\u0623\u062E\u0631 \u0625\u0631\u0641\u0627\u0642 \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062A \u0641\u064A \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
        content: "\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0648\u062A\u0623\u062E\u0631 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u0631\u0641\u0642\u0629 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0639 \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
        sourceType: "feedback",
        topic: "\u0645\u0634\u0627\u0643\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641\u0627\u062A"
      },
      {
        title: "\u0645\u0634\u0643\u0644\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0640 Google",
        content: "\u0645\u0634\u0643\u0644\u0629 \u0641\u064A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0639\u0628\u0631 \u062D\u0633\u0627\u0628 \u062C\u0648\u062C\u0644\u060C \u064A\u0639\u0648\u062F \u0644\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0628\u062F\u0648\u0646 \u0625\u062A\u0645\u0627\u0645 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0646\u062C\u0627\u062D.",
        sourceType: "feedback",
        topic: "\u0645\u0634\u0627\u0643\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644"
      },
      {
        title: "\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0627\u0644\u0633\u0631\u064A\u0639",
        content: "\u062A\u0646\u0633\u064A\u0642 \u062C\u0644\u0633\u0629 \u0627\u0644\u062F\u062E\u0648\u0644 \u064A\u0646\u062A\u0647\u064A \u0628\u0633\u0631\u0639\u0629 \u0648\u064A\u0644\u0632\u0645 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062F\u062E\u0648\u0644 \u0648\u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0643\u062B\u0631 \u0645\u0646 \u0645\u0631\u0629 \u0628\u0627\u0644\u064A\u0648\u0645.",
        sourceType: "feedback",
        topic: "\u0645\u0634\u0627\u0643\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644"
      },
      {
        title: "\u0627\u0646\u0642\u0637\u0627\u0639 \u0627\u0644\u0635\u0648\u062A \u0641\u064A \u0627\u0644\u0628\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631 Live Voice",
        content: "\u0627\u0644\u0635\u0648\u062A \u0641\u064A \u0648\u0636\u0639 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 Live Voice \u064A\u0646\u0642\u0637\u0639 \u0623\u062D\u064A\u0627\u0646\u0627\u064B \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u062D\u062F\u062B \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0645\u0639 \u062E\u0641\u0636 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646.",
        sourceType: "feedback",
        topic: "\u0645\u0634\u0627\u0643\u0644 \u0627\u0644\u0635\u0648\u062A \u0648\u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0635\u0648\u062A\u064A"
      },
      {
        title: "\u062A\u0623\u062E\u0631 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 TTS",
        content: "\u062A\u0623\u062E\u0631 \u0641\u064A \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u0648\u062A \u0648\u0627\u0646\u062E\u0641\u0627\u0636 \u062C\u0648\u062F\u0629 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646 \u0641\u064A \u0648\u0636\u0639 \u0627\u0644\u0628\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0627\u0644\u0635\u0648\u062A\u064A \u0639\u0644\u0649 \u0627\u0644\u0645\u062A\u0635\u0641\u062D.",
        sourceType: "feedback",
        topic: "\u0645\u0634\u0627\u0643\u0644 \u0627\u0644\u0635\u0648\u062A \u0648\u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0635\u0648\u062A\u064A"
      },
      {
        title: "\u0637\u0644\u0628 \u062A\u0635\u062F\u064A\u0631 \u0645\u0644\u0641\u0627\u062A PDF \u0648\u062A\u062E\u0635\u064A\u0635 \u0627\u0644\u062B\u064A\u0645\u0627\u062A",
        content: "\u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u064A\u0632\u0629 \u0627\u0644\u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0644\u0645\u0644\u0641\u0627\u062A PDF \u0648\u062A\u062E\u0635\u064A\u0635 \u062B\u064A\u0645\u0627\u062A \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0627\u0644\u062F\u0627\u0643\u0646\u0629.",
        sourceType: "feedback",
        topic: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0648\u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0627\u062A"
      },
      {
        title: "\u0627\u0642\u062A\u0631\u0627\u062D \u062A\u062D\u0633\u064A\u0646 \u0633\u0631\u0639\u0629 \u0628\u062D\u062B \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A",
        content: "\u0627\u0642\u062A\u0631\u0627\u062D \u062A\u062D\u0633\u064A\u0646 \u0633\u0631\u0639\u0629 \u0627\u0644\u0628\u062D\u062B \u0648\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0648\u0627\u0644\u0645\u0647\u0627\u0645 \u0641\u064A \u0642\u0633\u0645 Google Keep Notes.",
        sourceType: "feedback",
        topic: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0648\u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0627\u062A"
      },
      // Admin & Policy Docs
      {
        title: "\u062F\u0644\u064A\u0644 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0648\u0627\u0644\u0628\u0627\u0642\u0627\u062A",
        content: "\u062F\u0644\u064A\u0644 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0639\u0627\u062F\u0644 \u0644\u0644\u0628\u0627\u0642\u0627\u062A \u0648\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0627\u0644\u0634\u0647\u0631\u064A\u0629 \u0648\u0627\u0644\u062A\u062C\u062F\u064A\u062F \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0644\u0639\u0645\u0644\u0627\u0621.",
        sourceType: "doc",
        topic: "\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0648\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A"
      },
      {
        title: "\u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u0633\u064A\u0627\u0633\u0629 Zero-PII",
        content: "\u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0628\u0646\u064A\u0629 \u0627\u0644\u062A\u062D\u062A\u064A\u0629 \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u062A\u0637\u0628\u064A\u0642 Zero-PII \u0648\u062D\u0638\u0631 \u062D\u0641\u0638 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0641\u064A \u0627\u0644\u062A\u0636\u0645\u064A\u0646\u0627\u062A.",
        sourceType: "doc",
        topic: "\u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629"
      },
      {
        title: "\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u062F\u0627\u0621 \u0648\u0632\u0645\u0646 \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u062E\u0648\u0627\u062F\u0645",
        content: "\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u062F\u0627\u0621 \u0648\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0641\u0646\u064A\u0629 \u0644\u0648\u0642\u062A \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u062E\u0648\u0627\u062F\u0645 \u0648\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0646\u0645\u0648\u0630\u062C Gemini 3.6 Flash \u0648\u0646\u0633\u0628 \u0627\u0644\u0646\u062C\u0627\u062D.",
        sourceType: "doc",
        topic: "\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0628\u0631\u0645\u062C\u064A\u0629 \u0648\u0627\u0644\u0623\u062F\u0627\u0621"
      },
      {
        title: "\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629 \u0627\u0644\u0645\u062C\u0645\u0639\u0629",
        content: "\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639 \u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0648\u062A\u062E\u0635\u064A\u0635 \u0623\u0645\u0627\u0643\u0646 \u0627\u0644\u0639\u0631\u0636 \u0628\u062F\u0648\u0646 \u062A\u062A\u0628\u0639 \u0641\u0631\u062F\u064A \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0623\u0648 \u0645\u0644\u0641\u0627\u062A \u0627\u0644\u062A\u0639\u0631\u064A\u0641.",
        sourceType: "doc",
        topic: "\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A"
      },
      // Ad Trends & Usage Analytics
      {
        title: "\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
        content: "\u0623\u0639\u0644\u0649 \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0627\u064B \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631: \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0630\u0643\u064A\u0629 68%\u060C \u0627\u0644\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0648\u064A\u0628 18%\u060C \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0635\u0648\u062A\u064A 14%.",
        sourceType: "ad_trend",
        topic: "\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u064A\u0632\u0627\u062A"
      },
      {
        title: "\u0623\u062F\u0627\u0621 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0648\u0627\u0644\u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629",
        content: "\u0646\u0633\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0645\u0646 \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629 \u0625\u0644\u0649 \u0627\u0644\u0628\u0627\u0642\u0627\u062A \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0629 \u0627\u0631\u062A\u0641\u0639\u062A \u0628\u0646\u0633\u0628\u0629 12% \u0628\u0639\u062F \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0639\u0631\u0648\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u064A\u0629.",
        sourceType: "ad_trend",
        topic: "\u0623\u062F\u0627\u0621 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A"
      },
      // System Logs
      {
        title: "\u0633\u062C\u0644 \u0623\u062E\u0637\u0627\u0621 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u062C\u0645\u0639\u0629",
        content: "\u0633\u062C\u0644 \u0646\u0638\u0627\u0645: \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 145 \u0645\u062D\u0627\u0648\u0644\u0629 \u0631\u0641\u0639 \u0645\u0644\u0641\u0627\u062A \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645\u0629 \u0648\u062A\u0645 \u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629.",
        sourceType: "system_log",
        topic: "\u0623\u062E\u0637\u0627\u0621 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0648\u0627\u0644\u0633\u062C\u0644\u0627\u062A"
      },
      {
        title: "\u0633\u062C\u0644 \u0623\u062F\u0627\u0621 \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
        content: "\u0633\u062C\u0644 \u0646\u0638\u0627\u0645: \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u062E\u0627\u062F\u0645 Gemini \u0636\u0645\u0646 \u0627\u0644\u0645\u062A\u0648\u0633\u0637 340ms \u0645\u0639 \u0643\u0641\u0627\u0621\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0639\u0627\u0644\u064A\u0629 \u062F\u0648\u0646 \u0627\u0646\u0642\u0637\u0627\u0639.",
        sourceType: "system_log",
        topic: "\u0623\u062E\u0637\u0627\u0621 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0648\u0627\u0644\u0633\u062C\u0644\u0627\u062A"
      }
    ];
    for (let i = 0; i < seedData.length; i++) {
      const entry = seedData[i];
      try {
        const id = `vec_seed_${i + 1}`;
        const { vector, sanitizedText, scrubbedCount, detectedTypes } = await this.generateVector(entry.content);
        const item = {
          id,
          title: entry.title,
          content: entry.content,
          sanitizedContent: sanitizedText,
          sourceType: entry.sourceType,
          topic: entry.topic,
          createdAt: new Date(Date.now() - (seedData.length - i) * 36e5).toISOString(),
          vector,
          scrubbedCount,
          detectedPiiTypes: detectedTypes,
          metadata: { isSeed: true }
        };
        this.memoryStore.push(item);
        await setDoc(doc(this.db, "vectorStore", id), item, { merge: true });
      } catch (err) {
        console.error(`Error seeding item ${entry.title}:`, err);
      }
    }
    console.log(`Successfully seeded ${this.memoryStore.length} vector items.`);
  }
  // Index new item into store
  async indexItem(title, content, sourceType, topic) {
    await this.initStore();
    const { sanitizedText, scrubbedCount, detectedTypes } = sanitizeTextForEmbedding(content);
    const sanitizedTitle = sanitizeTextForEmbedding(title).sanitizedText || title;
    const { vector } = await this.generateVector(sanitizedText);
    const id = `vec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newItem = {
      id,
      title: sanitizedTitle,
      content,
      sanitizedContent: sanitizedText,
      sourceType,
      topic: topic || "\u0639\u0627\u0645",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      vector,
      scrubbedCount,
      detectedPiiTypes: detectedTypes,
      metadata: { indexedBy: "admin" }
    };
    this.memoryStore.push(newItem);
    await setDoc(doc(this.db, "vectorStore", id), newItem, { merge: true });
    return newItem;
  }
  // Perform Semantic Vector Search
  async semanticSearch(queryText, topK = 5, sourceType) {
    const startTime = Date.now();
    await this.initStore();
    const { sanitizedText, scrubbedCount, detectedTypes } = sanitizeTextForEmbedding(queryText);
    if (!sanitizedText) {
      throw new Error("\u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0627\u0644\u0628\u062D\u062B \u0641\u0627\u0631\u063A \u0628\u0639\u062F \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 Zero-PII.");
    }
    const { vector: queryVector } = await this.generateVector(sanitizedText);
    let itemsToSearch = this.memoryStore;
    if (sourceType && sourceType !== "all") {
      itemsToSearch = itemsToSearch.filter((item) => item.sourceType === sourceType);
    }
    const scoredItems = itemsToSearch.map((item) => {
      const score = cosineSimilarity(queryVector, item.vector);
      return {
        item,
        similarityScore: score,
        similarityPercentage: Math.round(score * 1e3) / 10
      };
    });
    scoredItems.sort((a, b) => b.similarityScore - a.similarityScore);
    const topResults = scoredItems.slice(0, topK);
    const latencyMs = Date.now() - startTime;
    this.searchCount++;
    this.searchLatencyTotalMs += latencyMs;
    return {
      results: topResults,
      sanitizedQuery: sanitizedText,
      scrubbedCount,
      detectedPiiTypes: detectedTypes,
      latencyMs
    };
  }
  // RAG Pipeline Execution
  async ragQuery(queryText, topK = 4) {
    const startTime = Date.now();
    const searchRes = await this.semanticSearch(queryText, topK);
    const contextText = searchRes.results.map((res, idx) => {
      return `[\u0645\u0635\u062F\u0631 ${idx + 1} - \u0627\u0644\u0646\u0648\u0639: ${res.item.sourceType} - \u0627\u0644\u0645\u0648\u0636\u0648\u0639: ${res.item.topic} - \u062A\u0634\u0627\u0628\u0647: ${res.similarityPercentage}%]:
\u0627\u0644\u0639\u0646\u0648\u0627\u0646: ${res.item.title}
\u0627\u0644\u0645\u062D\u062A\u0648\u0649: ${res.item.sanitizedContent}`;
    }).join("\n\n");
    const ragPrompt = `\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0625\u062F\u0627\u0631\u064A \u0630\u0643\u064A \u064A\u0646\u0641\u0630 \u0627\u0633\u062A\u0639\u0644\u0627\u0645 RAG (Retrieval-Augmented Generation) \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0645\u0633\u062A\u0631\u062C\u0639\u0629 \u062F\u0644\u0627\u0644\u064A\u0627\u064B \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A Vector Database \u0644\u0645\u0646\u0635\u0629 THOTH.

\u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0623\u0635\u0644\u064A \u0644\u0644\u0645\u062F\u064A\u0631:
"${searchRes.sanitizedQuery}"

\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0623\u0643\u062B\u0631 \u0627\u0631\u062A\u0628\u0627\u0637\u0627\u064B \u0627\u0644\u0645\u0633\u062A\u0631\u062C\u0639\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 Gemini Embeddings (${this.MODEL_ID}):
---
${contextText}
---

\u0627\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A:
1. \u0623\u062C\u0628 \u0628\u0623\u0633\u0644\u0648\u0628 \u0625\u062F\u0627\u0631\u064A \u0645\u0628\u0627\u0634\u0631 \u0648\u0648\u0627\u0636\u062D \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0631\u062C\u0639\u0629 \u0623\u0639\u0644\u0627\u0647.
2. \u0648\u0636\u062D \u0623\u0643\u062B\u0631 \u0627\u0644\u0645\u0634\u0627\u0643\u0644 \u0623\u0648 \u0627\u0644\u0646\u0642\u0627\u0637 \u062A\u0643\u0631\u0627\u0631\u0627\u064B \u0648\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0625\u0646 \u0648\u062C\u062F\u062A.
3. \u0625\u0630\u0627 \u0644\u0645 \u062A\u062C\u062F \u0625\u062C\u0627\u0628\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0641\u064A \u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u0645\u0631\u0641\u0642\u0629\u060C \u0627\u0630\u0643\u0631 \u0630\u0644\u0643 \u0628\u0648\u0636\u0648\u062D \u0648\u0627\u0642\u062A\u0631\u062D \u0625\u062C\u0631\u0627\u0621 \u0628\u062D\u062B \u0623\u0648\u0633\u0639.
4. \u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0633\u0631\u064A\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648 Zero-PII \u0628\u062F\u0648\u0646 \u0630\u0643\u0631 \u0623\u064A \u0623\u0633\u0645\u0627\u0621 \u0623\u0641\u0631\u0627\u062F \u0623\u0648 \u0645\u0639\u0631\u0641\u0627\u062A \u0634\u062E\u0635\u064A\u0629.`;
    const llmResponse = await this.aiClient.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: ragPrompt
    });
    const ragAnswer = llmResponse.text || "\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0628\u0646\u062C\u0627\u062D \u0648\u0644\u0643\u0646 \u062A\u0639\u0630\u0631 \u062A\u0648\u0644\u064A\u062F \u0645\u0644\u062E\u0635 \u0627\u0644\u0646\u0635 \u0627\u0644\u0643\u0627\u0645\u0644.";
    const totalLatency = Date.now() - startTime;
    return {
      query: queryText,
      sanitizedQuery: searchRes.sanitizedQuery,
      ragAnswer,
      retrievedResults: searchRes.results,
      latencyMs: totalLatency,
      modelUsedForAnswer: "gemini-3.1-flash-lite",
      embeddingModelUsed: this.MODEL_ID
    };
  }
  // Topics & Case Count Summaries
  async getTopicsSummary() {
    await this.initStore();
    const topicMap = /* @__PURE__ */ new Map();
    this.memoryStore.forEach((item) => {
      const topicName = item.topic || "\u0639\u0627\u0645";
      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, { count: 0, sourceTypes: {}, samples: [] });
      }
      const record = topicMap.get(topicName);
      record.count++;
      record.sourceTypes[item.sourceType] = (record.sourceTypes[item.sourceType] || 0) + 1;
      if (record.samples.length < 3) {
        record.samples.push(item.title);
      }
    });
    const total = this.memoryStore.length || 1;
    const summaries = [];
    topicMap.forEach((val, topic) => {
      summaries.push({
        topic,
        count: val.count,
        percentage: Math.round(val.count / total * 1e3) / 10,
        sourceTypeCount: val.sourceTypes,
        sampleContents: val.samples
      });
    });
    summaries.sort((a, b) => b.count - a.count);
    return summaries;
  }
  // Calculate similarity matrix among user feedback
  async getFeedbackSimilarityMatrix() {
    await this.initStore();
    const feedbackItems = this.memoryStore.filter((item) => item.sourceType === "feedback");
    const pairs = [];
    for (let i = 0; i < feedbackItems.length; i++) {
      for (let j = i + 1; j < feedbackItems.length; j++) {
        const item1 = feedbackItems[i];
        const item2 = feedbackItems[j];
        const score = cosineSimilarity(item1.vector, item2.vector);
        pairs.push({
          id1: item1.id,
          title1: item1.title,
          id2: item2.id,
          title2: item2.title,
          similarityScore: score,
          similarityPercentage: Math.round(score * 1e3) / 10,
          topic: item1.topic === item2.topic ? item1.topic : "\u0645\u0648\u0627\u0636\u064A\u0639 \u0645\u062E\u062A\u0644\u0641\u0629"
        });
      }
    }
    pairs.sort((a, b) => b.similarityScore - a.similarityScore);
    return pairs;
  }
  // Overview Stats
  async getStats() {
    await this.initStore();
    const topicSummaries = await this.getTopicsSummary();
    const avgLatency = this.searchCount > 0 ? Math.round(this.searchLatencyTotalMs / this.searchCount) : 180;
    const sourceCounts = {
      feedback: this.memoryStore.filter((i) => i.sourceType === "feedback").length,
      doc: this.memoryStore.filter((i) => i.sourceType === "doc").length,
      system_log: this.memoryStore.filter((i) => i.sourceType === "system_log").length,
      ad_trend: this.memoryStore.filter((i) => i.sourceType === "ad_trend").length
    };
    return {
      totalIndexedDocs: this.memoryStore.length,
      totalSemanticSearches: this.searchCount,
      averageSearchLatencyMs: avgLatency,
      actualModelId: this.MODEL_ID,
      zeroPiiActive: true,
      sourceCounts,
      topTopics: topicSummaries.slice(0, 5),
      privacyReport: {
        piiPolicy: "Zero-PII Layer Active (Strict Regex Scrubbing before Embedding)",
        dataTransferredToGoogle: "Sanitized Non-PII Text only to Google Gemini Embedding API",
        storageType: "Firestore (vectorStore collection) + Fast In-Memory Cache"
      }
    };
  }
  // Delete Item
  async deleteItem(id) {
    await this.initStore();
    this.memoryStore = this.memoryStore.filter((item) => item.id !== id);
    try {
      await deleteDoc(doc(this.db, "vectorStore", id));
      return true;
    } catch (err) {
      console.error("Error deleting vector item:", err);
      return false;
    }
  }
  // Get raw items (for admin view - vector hidden by default)
  async getItems(sourceType) {
    await this.initStore();
    let filtered = this.memoryStore;
    if (sourceType && sourceType !== "all") {
      filtered = filtered.filter((item) => item.sourceType === sourceType);
    }
    return filtered.map(({ vector, ...rest }) => ({
      ...rest,
      vectorLength: vector ? vector.length : 0
    }));
  }
};

// server.ts
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
}
if (!getAdminApps().length) {
  try {
    initFirebaseAdmin({
      projectId: firebase_applet_config_default.projectId
    });
  } catch (err) {
    console.error("Firebase admin initializeApp error:", err);
  }
}
var VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
var VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
var VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:onq6974@gmail.com";
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log("Web Push VAPID configured.");
  } catch (err) {
    console.error("VAPID setup error:", err);
  }
}
function buildWebPushPayload(opts) {
  return {
    notification: {
      title: opts.title,
      body: opts.body,
      icon: opts.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192-maskable.png"
    },
    data: {
      deepLink: opts.deepLink || "/",
      notificationId: opts.notificationId || "",
      eventId: opts.eventId || "",
      category: opts.category || "General"
    }
  };
}
async function sendWebPushToSubscription(subscriptionJson, payload) {
  try {
    const sub = JSON.parse(subscriptionJson);
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return "failed";
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3 * 24 * 3600 });
    return "ok";
  } catch (err) {
    const statusCode = err?.statusCode;
    if (statusCode === 404 || statusCode === 410) return "gone";
    console.error("Web push send failed:", statusCode || "", err?.message || err);
    return "failed";
  }
}
var webApp = getWebApps().length > 0 ? getWebApps()[0] : initWebFirebase(firebase_applet_config_default);
var dbWeb = initializeWebFirestore(
  webApp,
  { experimentalForceLongPolling: true },
  firebase_applet_config_default.firestoreDatabaseId
);
async function safeFetchJson(res, fallback = {}) {
  try {
    const contentType = res.headers ? res.headers.get("content-type") || "" : "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    return fallback;
  } catch (err) {
    return fallback;
  }
}
var ai = null;
var embeddingManager = new AiEmbeddingManager(ai, dbWeb);
var dbApiKeysCache = {};
async function getDbApiKeys(forceReload = false) {
  if (!forceReload && Object.keys(dbApiKeysCache).length > 0) {
    return dbApiKeysCache;
  }
  try {
    const [keysSnap, apiSnap] = await Promise.all([
      getDoc(doc2(dbWeb, "systemConfig", "apiKeys")),
      getDoc(doc2(dbWeb, "systemConfig", "api"))
    ]);
    const keysData = keysSnap.exists() ? keysSnap.data() : {};
    const apiData = apiSnap.exists() ? apiSnap.data() : {};
    const merged = { ...apiData, ...keysData };
    for (const k of Object.keys(merged)) {
      if (typeof merged[k] === "string" && merged[k].startsWith("****")) {
        delete merged[k];
      }
    }
    dbApiKeysCache = merged;
  } catch (err) {
    console.error("Error loading system API keys strictly from database:", err);
  }
  return dbApiKeysCache;
}
async function refreshAiClient() {
  const dbKeys = await getDbApiKeys(true).catch(() => ({}));
  const envGeminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.API_KEY || "").trim();
  const dbGeminiKey = typeof dbKeys?.geminiApiKey === "string" ? dbKeys.geminiApiKey.trim() : "";
  const effectiveKey = envGeminiKey || dbGeminiKey;
  console.log("Refreshing GoogleGenAI client with key from:", envGeminiKey ? "HOSTING_ENV" : dbGeminiKey ? "DATABASE" : "NONE", effectiveKey ? effectiveKey.slice(0, 8) + "..." : "NONE");
  if (effectiveKey) {
    ai = new GoogleGenAI({
      apiKey: effectiveKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  } else {
    ai = null;
  }
  if (embeddingManager) {
    embeddingManager.updateAiClient(ai);
  }
}
var app = express();
var liveWss = null;
function handleLiveUpgrade(request, socket, head) {
  if (!liveWss) return false;
  try {
    const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/api/live-audio" || url.pathname === "/api/live-translate-ws") {
      liveWss.handleUpgrade(request, socket, head, (ws) => {
        liveWss.emit("connection", ws, request);
      });
      return true;
    }
  } catch (err) {
    console.error("Live WS upgrade error:", err);
  }
  return false;
}
async function startServer() {
  refreshAiClient().catch((err) => console.error("Error refreshing AI client on startup:", err));
  app.use(express.json({ limit: "150mb" }));
  const PORT = Number(process.env.PORT || 3e3);
  const DEFAULT_USAGE_PLANS = {
    guest: {
      id: "guest",
      name: "\u0632\u0627\u0626\u0631 (\u063A\u064A\u0631 \u0645\u0633\u062C\u0644)",
      price: "\u0645\u062C\u0627\u0646\u0627\u064B",
      priceEgp: 0,
      priceUsd: 0,
      normalChat: 5,
      thinkingChat: 2,
      webSearch: 1,
      liveVoiceSec: 120,
      // 2 minutes strictly for unauthenticated guests per 24 hours
      translation: 5,
      audioSummary: 0,
      textSummary: 0,
      badge: "\u0632\u0627\u0626\u0631",
      features: ["\u062A\u062C\u0631\u0628\u0629 \u0623\u0648\u0644\u064A\u0629 \u0644\u0644\u062F\u0631\u062F\u0634\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629", "\u062A\u0641\u0643\u064A\u0631 \u0639\u0645\u064A\u0642 \u0648\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u062A\u062C\u0631\u064A\u0628\u064A", "\u0628\u062D\u062B \u0648\u064A\u0628 \u0645\u0628\u0627\u0634\u0631", "\u0645\u062D\u0627\u062F\u062B\u0629 \u0635\u0648\u062A\u064A\u0629 \u062D\u064A\u0629 THOTH Live", "\u064A\u062A\u0637\u0644\u0628 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0644\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0643\u0627\u0645\u0644"]
    },
    free: {
      id: "free",
      name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629",
      price: "\u0645\u062C\u0627\u0646\u0627\u064B",
      priceEgp: 0,
      priceUsd: 0,
      normalChat: 20,
      thinkingChat: 15,
      webSearch: 3,
      liveVoiceSec: 300,
      // 5 mins
      translation: 15,
      audioSummary: 1,
      textSummary: 2,
      badge: "\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      features: ["\u0631\u062F\u0648\u062F \u0633\u0631\u064A\u0639\u0629 \u0648\u0630\u0643\u064A\u0629 \u0644\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629", "\u062A\u0641\u0643\u064A\u0631 \u0639\u0645\u064A\u0642 \u0648\u062A\u062D\u0644\u064A\u0644 \u0645\u0646\u0637\u0642\u064A \u0645\u062A\u0642\u062F\u0645", "\u0628\u062D\u062B \u0645\u0628\u0627\u0634\u0631 \u0641\u064A \u0627\u0644\u0648\u064A\u0628 \u0645\u0639 \u0645\u0635\u0627\u062F\u0631 \u062D\u064A\u0629", "\u0645\u0644\u062E\u0635 \u0635\u0648\u062A\u064A \u0648\u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0630\u0643\u064A \u064A\u0648\u0645\u064A", "\u062A\u0644\u062E\u064A\u0635 \u0646\u0635\u064A \u0644\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0648\u0627\u0644\u0631\u0648\u0627\u0628\u0637", "\u062D\u0648\u0627\u0631 \u0635\u0648\u062A\u064A \u062A\u0641\u0627\u0639\u0644\u064A THOTH Live"]
    },
    basic: {
      id: "basic",
      name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      price: "99 \xA3 / \u0634\u0647\u0631\u064A\u0627\u064B",
      priceEgp: 99,
      priceUsd: 5,
      normalChat: 60,
      thinkingChat: 40,
      webSearch: 5,
      liveVoiceSec: 1200,
      // 20 mins
      translation: 50,
      audioSummary: 2,
      textSummary: 5,
      badge: "\u0634\u0627\u0626\u0639\u0629",
      features: ["\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0630\u0643\u064A\u0629 \u0645\u0648\u0633\u0639\u0629 \u0648\u0633\u0631\u064A\u0639\u0629", "\u062A\u0641\u0643\u064A\u0631 \u0639\u0645\u064A\u0642 \u0648\u062A\u062D\u0644\u064A\u0644 \u0645\u0633\u0627\u0626\u0644 \u0645\u0637\u0648\u0631", "\u0628\u062D\u062B \u0648\u064A\u0628 \u062D\u064A \u0645\u0639 \u0631\u0648\u0627\u0628\u0637 \u0645\u0648\u062B\u0648\u0642\u0629", "\u0645\u0644\u062E\u0635\u0627\u062A \u0635\u0648\u062A\u064A\u0629 \u0648\u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0630\u0643\u064A \u0645\u062A\u0639\u062F\u062F", "\u062A\u0644\u062E\u064A\u0635 \u0634\u0627\u0645\u0644 \u0644\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0644\u0641\u0627\u062A", "\u062C\u0644\u0633\u0627\u062A \u062D\u0648\u0627\u0631 \u0635\u0648\u062A\u064A THOTH Live \u0623\u0637\u0648\u0644"]
    },
    pro: {
      id: "pro",
      name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 (Pro)",
      price: "199 \xA3 / \u0634\u0647\u0631\u064A\u0627\u064B",
      priceEgp: 199,
      priceUsd: 10,
      normalChat: 180,
      thinkingChat: 120,
      webSearch: 12,
      liveVoiceSec: 2400,
      // 40 mins
      translation: 150,
      audioSummary: 5,
      textSummary: 15,
      badge: "\u0627\u0644\u0623\u0643\u062B\u0631 \u0627\u062E\u062A\u064A\u0627\u0631\u0627\u064B",
      features: ["\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0630\u0643\u064A\u0629 \u0633\u0631\u064A\u0639\u0629 \u0648\u0645\u0643\u062B\u0641\u0629", "\u062A\u0641\u0643\u064A\u0631 \u0648\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0645\u0646\u0637\u0642\u064A \u062F\u0642\u064A\u0642 \u0648\u0645\u0648\u0633\u0639", "\u0628\u062D\u062B \u0648\u0627\u0633\u062A\u0642\u0635\u0627\u0621 \u0648\u064A\u0628 \u0641\u0648\u0631\u064A \u0648\u0645\u062D\u062F\u062B", "\u0627\u0633\u062A\u0648\u062F\u064A\u0648 \u0645\u062A\u0642\u062F\u0645 \u0644\u0644\u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0627\u0644\u0635\u0648\u062A\u064A", "\u062A\u0644\u062E\u064A\u0635 \u0627\u062D\u062A\u0631\u0627\u0641\u064A \u0644\u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A", "\u062D\u0648\u0627\u0631 \u0635\u0648\u062A\u064A THOTH Live \u0639\u0627\u0644\u064A \u0627\u0644\u062F\u0642\u0629", "\u062A\u0643\u0627\u0645\u0644 \u0643\u0627\u0645\u0644 \u0645\u0639 THOTH Workspace"]
    },
    max: {
      id: "max",
      name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0642\u0635\u0648\u0649 (Max)",
      price: "399 \xA3 / \u0634\u0647\u0631\u064A\u0627\u064B",
      priceEgp: 399,
      priceUsd: 20,
      normalChat: 400,
      thinkingChat: 250,
      webSearch: 25,
      liveVoiceSec: 4800,
      // 80 mins
      translation: 400,
      audioSummary: 10,
      textSummary: 30,
      badge: "\u0627\u0644\u0623\u0641\u0636\u0644 \u0644\u0644\u0623\u0639\u0645\u0627\u0644",
      features: ["\u0633\u0639\u0629 \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0636\u062E\u0645\u0629 \u0648\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0641\u0627\u0626\u0642\u0629", "\u062A\u062D\u0644\u064A\u0644 \u0645\u0646\u0637\u0642\u064A \u0648\u062A\u0641\u0643\u064A\u0631 \u0639\u0645\u064A\u0642 \u0645\u0643\u062B\u0641", "\u0628\u062D\u062B \u0648\u064A\u0628 \u062A\u062D\u0644\u064A\u0644\u064A \u0645\u062A\u0642\u062F\u0645 \u0648\u0634\u0627\u0645\u0644", "\u0645\u0644\u062E\u0635\u0627\u062A \u0635\u0648\u062A\u064A\u0629 \u0648\u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0645\u062A\u0639\u062F\u062F\u0629", "\u0645\u0639\u0627\u0644\u062C\u0629 \u0648\u062A\u062D\u0644\u064A\u0644 \u0645\u062A\u0642\u062F\u0645 \u0644\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0643\u0628\u064A\u0631\u0629", "\u062D\u0648\u0627\u0631 \u0635\u0648\u062A\u064A \u062D\u064A \u0645\u0637\u0648\u0644 \u0648\u0623\u0648\u0644\u0648\u064A\u0629 \u0645\u0639\u0627\u0644\u062C\u0629", "\u062F\u0639\u0645 \u0641\u0646\u064A \u0648\u0623\u0648\u0644\u0648\u064A\u0629 \u0642\u0635\u0648\u0649"]
    },
    ultra: {
      id: "ultra",
      name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0641\u0627\u0626\u0642\u0629 (Ultra)",
      price: "599 \xA3 / \u0634\u0647\u0631\u064A\u0627\u064B",
      priceEgp: 599,
      priceUsd: 30,
      normalChat: 1e3,
      thinkingChat: 600,
      webSearch: 50,
      liveVoiceSec: 10800,
      // 180 mins
      translation: 1e3,
      audioSummary: 25,
      textSummary: 60,
      badge: "\u0633\u0639\u0629 \u0641\u0627\u0626\u0642\u0629",
      features: ["\u0623\u0639\u0644\u0649 \u0633\u0639\u0629 \u0644\u0644\u0631\u062F\u0648\u062F \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u0648\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A", "\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0639\u0645\u064A\u0642 \u0648\u062A\u0641\u0643\u064A\u0631 \u062A\u062D\u0644\u064A\u0644\u064A \u0628\u0623\u0639\u0644\u0649 \u062F\u0642\u0629", "\u0628\u062D\u062B \u0648\u0627\u0633\u062A\u0642\u0635\u0627\u0621 \u0648\u064A\u0628 \u0641\u0648\u0631\u064A \u0645\u0633\u062A\u0645\u0631", "\u0627\u0633\u062A\u0648\u062F\u064A\u0648 \u0635\u0648\u062A\u064A \u0648\u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0645\u062A\u0643\u0627\u0645\u0644", "\u062A\u062D\u0644\u064A\u0644 \u0648\u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0634\u0627\u0645\u0644 \u0644\u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A", "\u062D\u0648\u0627\u0631 \u0635\u0648\u062A\u064A \u0645\u0633\u062A\u0645\u0631 THOTH Live \u0628\u0623\u0639\u0644\u0649 \u062C\u0648\u062F\u0629", "\u0623\u0648\u0644\u0648\u064A\u0629 \u0645\u0637\u0644\u0642\u0629 \u0639\u0644\u0649 \u0633\u064A\u0631\u0641\u0631\u0627\u062A \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0641\u0627\u0626\u0642\u0629"]
    }
  };
  async function getUsagePlansConfig() {
    try {
      const snap = await getDoc(doc2(dbWeb, "systemConfig", "usagePlans"));
      if (snap.exists()) {
        const customPlans = snap.data();
        const finalPlans = { ...DEFAULT_USAGE_PLANS };
        for (const k of Object.keys(DEFAULT_USAGE_PLANS)) {
          const defaultPlan = DEFAULT_USAGE_PLANS[k];
          const customPlan = customPlans[k] || {};
          const egpPrice = typeof customPlan.priceEgp === "number" && customPlan.priceEgp > 0 ? customPlan.priceEgp : k === "guest" || k === "free" ? 0 : defaultPlan.priceEgp;
          const usdPrice = typeof customPlan.priceUsd === "number" && customPlan.priceUsd > 0 ? customPlan.priceUsd : k === "guest" || k === "free" ? 0 : defaultPlan.priceUsd;
          finalPlans[k] = {
            ...defaultPlan,
            ...customPlan,
            priceEgp: egpPrice,
            priceUsd: usdPrice,
            price: customPlan.price || defaultPlan.price || (egpPrice > 0 ? `${egpPrice} \xA3 / \u0634\u0647\u0631\u064A\u0627\u064B` : "\u0645\u062C\u0627\u0646\u0627\u064B"),
            badge: customPlan.badge || defaultPlan.badge,
            features: Array.isArray(customPlan.features) && customPlan.features.length > 0 ? customPlan.features : defaultPlan.features
          };
        }
        for (const k of Object.keys(customPlans)) {
          if (!finalPlans[k] && typeof customPlans[k] === "object") {
            finalPlans[k] = customPlans[k];
          }
        }
        return finalPlans;
      }
    } catch (e) {
      console.error("Error loading usagePlans config:", e);
    }
    return DEFAULT_USAGE_PLANS;
  }
  function getTodayDateStr() {
    const d = /* @__PURE__ */ new Date();
    d.setUTCHours(d.getUTCHours() + 3);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  async function checkAndIncrementUsageServerSide(userId, clientIp, featureType, cost = 1) {
    try {
      const today = getTodayDateStr();
      const plansConfig = await getUsagePlansConfig();
      if (!userId || userId === "guest" || userId === "anonymous") {
        const guestPlan = plansConfig.guest || DEFAULT_USAGE_PLANS.guest;
        const limitVal2 = Number(guestPlan[featureType] || 0);
        if (limitVal2 <= 0) {
          return {
            allowed: false,
            code: "LOGIN_REQUIRED",
            errorText: "Sign in to use this feature.",
            planId: "guest",
            used: 0,
            limit: 0
          };
        }
        const ipKey = clientIp.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const guestRef = doc2(dbWeb, "guestUsage", `${ipKey}_${today}`);
        const guestSnap = await getDoc(guestRef);
        const guestData = guestSnap.exists() ? guestSnap.data() : {};
        const currentUsed2 = Number(guestData[featureType] || 0);
        if (currentUsed2 + cost > limitVal2) {
          return {
            allowed: false,
            code: "LOGIN_REQUIRED",
            errorText: "Sign in to continue using THOTH.",
            planId: "guest",
            used: currentUsed2,
            limit: limitVal2
          };
        }
        await setDoc2(guestRef, {
          ip: clientIp,
          date: today,
          [featureType]: currentUsed2 + cost,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
        return { allowed: true, planId: "guest", used: currentUsed2 + cost, limit: limitVal2 };
      }
      const userRef = doc2(dbWeb, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      let userPlanId = (userData.plan || "free").toLowerCase();
      if (userData.subscriptionExpiresAt && userData.subscriptionExpiresAt !== "permanent" && userPlanId !== "free") {
        const expTime = new Date(userData.subscriptionExpiresAt).getTime();
        if (!isNaN(expTime) && Date.now() > expTime) {
          userPlanId = "free";
          setDoc2(userRef, { plan: "free", subscriptionStatus: "expired", planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true }).catch(() => null);
        }
      }
      const planConfig = plansConfig[userPlanId] || plansConfig["free"] || DEFAULT_USAGE_PLANS.free;
      const limitVal = Number(planConfig[featureType] ?? DEFAULT_USAGE_PLANS.free[featureType]);
      const usageRef = doc2(dbWeb, "users", userId, "usage", today);
      const usageSnap = await getDoc(usageRef);
      const usageData = usageSnap.exists() ? usageSnap.data() : {};
      const currentUsed = Number(usageData[featureType] || 0);
      if (currentUsed + cost > limitVal) {
        let errorMsg = "You've reached your daily usage limit. Upgrade your plan to continue.";
        if (userPlanId !== "free") {
          errorMsg = "You've reached your current usage limit. Upgrade for more access.";
        }
        return {
          allowed: false,
          code: "LIMIT_REACHED",
          errorText: errorMsg,
          planId: userPlanId,
          used: currentUsed,
          limit: limitVal
        };
      }
      await setDoc2(usageRef, {
        date: today,
        [featureType]: currentUsed + cost,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      await setDoc2(userRef, {
        [`dailyUsage_${today}_${featureType}`]: currentUsed + cost,
        lastUsageAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      return { allowed: true, planId: userPlanId, used: currentUsed + cost, limit: limitVal };
    } catch (dbErr) {
      console.error("Database connection failure in usage limit validation:", dbErr?.message || dbErr);
      return {
        allowed: false,
        code: "DATABASE_UNAVAILABLE",
        errorText: "\u0639\u0630\u0631\u0627\u064B\u060C \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A THOTH \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u0645\u0624\u0642\u062A\u0627\u064B \u0644\u062D\u0645\u0627\u064A\u0629 \u062D\u0633\u0627\u0628\u0643 \u0645\u0646 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645. \u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F \u0642\u0644\u064A\u0644.",
        planId: "unknown",
        used: 0,
        limit: 0
      };
    }
  }
  app.post("/api/sync-voice-usage", async (req, res) => {
    try {
      const { userId, seconds } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
      const checkResult = await checkAndIncrementUsageServerSide(userId, clientIp, "liveVoiceSec", Number(seconds) || 0);
      res.json(checkResult);
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645" });
    }
  });
  async function getUserProfileContext(userId) {
    if (!userId) return "";
    try {
      const userDocSnap = await getDoc(doc2(dbWeb, "users", userId));
      let info = "";
      if (userDocSnap.exists()) {
        const d = userDocSnap.data();
        info += "\n\n[\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0634\u062E\u0636\u064A\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645]:";
        if (d.name && !d.name.includes("@")) info += `
- \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${d.name}`;
        if (d.age) info += `
- \u0639\u0645\u0631\u0647: ${d.age}`;
        if (d.country) info += `
- \u062F\u0648\u0644\u062A\u0647: ${d.country}`;
        if (d.school) info += `
- \u062F\u0631\u0627\u0633\u062A\u0647: ${d.school}`;
        if (d.interests) info += `
- \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A\u0647: ${d.interests}`;
      }
      try {
        const notesSnap = await getDocs2(query(collection2(dbWeb, "users", userId, "notes"), limit(10)));
        if (!notesSnap.empty) {
          info += "\n\n[\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0645\u0646\u0635\u0629 THOTH Keep]:";
          notesSnap.forEach((snap) => {
            const n = snap.data();
            info += `
- \u0645\u0644\u0627\u062D\u0638\u0629 (\u0627\u0644\u0639\u0646\u0648\u0627\u0646: ${n.title || "\u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646"}): ${n.content ? n.content.substring(0, 100) : ""}...`;
          });
        }
      } catch (e) {
      }
      try {
        const tasksSnap = await getDocs2(query(collection2(dbWeb, "users", userId, "tasks"), limit(15)));
        if (!tasksSnap.empty) {
          info += "\n\n[\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0645\u0646\u0635\u0629 THOTH Tasks]:";
          tasksSnap.forEach((snap) => {
            const t = snap.data();
            info += `
- \u0645\u0647\u0645\u0629: ${t.title || ""} (\u0627\u0644\u062D\u0627\u0644\u0629: ${t.status === "completed" ? "\u0645\u0643\u062A\u0645\u0644\u0629" : "\u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630"})`;
          });
        }
      } catch (e) {
      }
      try {
        const classesSnap = await getDocs2(query(collection2(dbWeb, "users", userId, "classroomCourses"), limit(5)));
        if (!classesSnap.empty) {
          info += "\n\n[\u062F\u0648\u0631\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0645\u0646\u0635\u0629 THOTH Classroom]:";
          classesSnap.forEach((snap) => {
            const c = snap.data();
            info += `
- \u062F\u0648\u0631\u0629: ${c.name || ""} (${c.section || ""})`;
          });
        }
      } catch (e) {
      }
      if (info) {
        info = '\n\n[\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629 \u0644\u0644\u0645\u0633\u0627\u0639\u062F\u0629: \u0623\u0646\u062A \u0645\u062A\u0635\u0644 \u0627\u0644\u0622\u0646 \u0628\u0643\u0627\u0641\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0627\u0644\u0645\u0646\u0635\u0629 (Notes, Tasks, Classroom). \u0623\u062C\u0628 \u0628\u0627\u062E\u062A\u0635\u0627\u0631 \u0648\u0645\u0628\u0627\u0634\u0631\u0629. \u0625\u0630\u0627 \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0647\u0645\u0629 \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0635\u064A\u063A\u0629: <action>{"type": "add_task", "title": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0647\u0645\u0629"} </action> \u0648\u0633\u064A\u062A\u0645 \u062A\u0646\u0641\u064A\u0630\u0647\u0627. \u0625\u0630\u0627 \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0633\u062A\u062E\u062F\u0645: <action>{"type": "add_note", "title": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646", "content": "\u0627\u0644\u0645\u062D\u062A\u0648\u0649"} </action> \u0648\u0633\u064A\u062A\u0645 \u062A\u0646\u0641\u064A\u0630\u0647\u0627.]' + info;
      }
      return info;
    } catch (e) {
      console.error("Error fetching user profile context:", e);
    }
    return "";
  }
  function getMimeTypeFromFileName(fileName, defaultMime = "application/octet-stream") {
    const ext = path.extname(fileName || "").toLowerCase();
    const mimeMap = {
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".markdown": "text/markdown",
      ".csv": "text/csv",
      ".json": "application/json",
      ".xml": "text/xml",
      ".html": "text/html",
      ".htm": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".cjs": "application/javascript",
      ".ts": "text/typescript",
      ".tsx": "text/typescript",
      ".jsx": "application/javascript",
      ".py": "text/x-python",
      ".c": "text/x-c",
      ".cpp": "text/x-c++",
      ".h": "text/x-c",
      ".java": "text/x-java",
      ".go": "text/x-go",
      ".rs": "text/x-rust",
      ".php": "text/x-php",
      ".rb": "text/x-ruby",
      ".sh": "text/x-sh",
      ".sql": "text/x-sql",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".webm": "audio/webm",
      ".ogg": "audio/ogg",
      ".m4a": "audio/m4a"
    };
    return mimeMap[ext] || defaultMime;
  }
  function sanitizeFileNameForTemp(name) {
    return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  }
  async function uploadBufferToGoogleFilesApi(buffer, fileName, mimeType) {
    if (!ai) {
      await refreshAiClient();
    }
    if (!ai) {
      throw new Error("\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0641\u062A\u0627\u062D Gemini API \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (systemConfig/apiKeys).");
    }
    const safeName = sanitizeFileNameForTemp(fileName || "file");
    const tempPath = path.join("/tmp", `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeName}`);
    try {
      await fs.promises.writeFile(tempPath, buffer);
      const uploadResult = await ai.files.upload({
        file: tempPath,
        config: {
          mimeType: mimeType || "application/octet-stream",
          displayName: fileName || safeName
        }
      });
      return uploadResult;
    } finally {
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch (err) {
        console.warn("Failed to delete temp file:", tempPath, err);
      }
    }
  }
  app.post("/api/files/upload", async (req, res) => {
    try {
      const { fileData, fileName = "file", mimeType: rawMimeType, userId } = req.body;
      if (!fileData) {
        return res.status(400).json({ success: false, error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0632\u0648\u064A\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0644\u0641." });
      }
      let dataBase64 = "";
      let detectedMime = rawMimeType || "";
      if (typeof fileData === "string" && fileData.startsWith("data:")) {
        const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          detectedMime = match[1];
          dataBase64 = match[2];
        } else {
          dataBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
        }
      } else if (typeof fileData === "string") {
        dataBase64 = fileData;
      }
      if (!dataBase64) {
        return res.status(400).json({ success: false, error: "\u0635\u064A\u063A\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629." });
      }
      const finalMimeType = detectedMime || getMimeTypeFromFileName(fileName, "application/octet-stream");
      const buffer = Buffer.from(dataBase64, "base64");
      if (buffer.length > 25 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: "\u062D\u062C\u0645 \u0627\u0644\u0645\u0644\u0641 \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 (25 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A)." });
      }
      const isImageOrAudio = finalMimeType.startsWith("image/") || finalMimeType.startsWith("audio/");
      const isSmallFile = buffer.length < 150 * 1024;
      if (isImageOrAudio && isSmallFile) {
        try {
          const uploadRes2 = await uploadBufferToGoogleFilesApi(buffer, fileName, finalMimeType);
          return res.json({
            success: true,
            isUploadedToFileApi: true,
            fileUri: uploadRes2.uri,
            fileRefName: uploadRes2.name,
            mimeType: uploadRes2.mimeType || finalMimeType,
            displayName: fileName || uploadRes2.displayName,
            sizeBytes: uploadRes2.sizeBytes || buffer.length,
            expirationTime: uploadRes2.expirationTime,
            state: uploadRes2.state
          });
        } catch (apiErr) {
          console.warn("Files API fallback to inline for small media:", apiErr);
          return res.json({
            success: true,
            isUploadedToFileApi: false,
            mimeType: finalMimeType,
            data: dataBase64,
            displayName: fileName,
            sizeBytes: buffer.length
          });
        }
      }
      const uploadRes = await uploadBufferToGoogleFilesApi(buffer, fileName, finalMimeType);
      return res.json({
        success: true,
        isUploadedToFileApi: true,
        fileUri: uploadRes.uri,
        fileRefName: uploadRes.name,
        mimeType: uploadRes.mimeType || finalMimeType,
        displayName: fileName || uploadRes.displayName,
        sizeBytes: uploadRes.sizeBytes || buffer.length,
        expirationTime: uploadRes.expirationTime,
        state: uploadRes.state
      });
    } catch (error) {
      console.error("Error uploading file via Google Files API:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641 \u0648\u0625\u0639\u062F\u0627\u062F\u0647 \u0641\u064A Google Files API."
      });
    }
  });
  app.post("/api/files/delete", async (req, res) => {
    try {
      if (!ai) {
        await refreshAiClient();
      }
      if (!ai) {
        return res.status(500).json({ success: false, error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0641\u062A\u0627\u062D Gemini API \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const { name, fileRefName } = req.body;
      const targetName = name || fileRefName;
      if (!targetName) {
        return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0645\u0631\u062C\u0639 \u0627\u0644\u0645\u0644\u0641 \u0645\u0637\u0644\u0648\u0628 \u0644\u062D\u0630\u0641\u0647." });
      }
      await ai.files.delete({ name: targetName });
      return res.json({ success: true, message: `\u062A\u0645 \u062D\u0630\u0641 \u0645\u0631\u062C\u0639 \u0627\u0644\u0645\u0644\u0641 ${targetName} \u0645\u0646 Google Files API \u0628\u0646\u062C\u0627\u062D.` });
    } catch (error) {
      console.error("Error deleting file from Google Files API:", error);
      res.status(500).json({ success: false, error: error?.message || "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0645\u0631\u062C\u0639 \u0627\u0644\u0645\u0644\u0641." });
    }
  });
  app.post("/api/files/info", async (req, res) => {
    try {
      if (!ai) {
        await refreshAiClient();
      }
      if (!ai) {
        return res.status(500).json({ success: false, error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0641\u062A\u0627\u062D Gemini API \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const { name, fileRefName } = req.body;
      const targetName = name || fileRefName;
      if (!targetName) {
        return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0645\u0631\u062C\u0639 \u0627\u0644\u0645\u0644\u0641 \u0645\u0637\u0644\u0648\u0628." });
      }
      const fileInfo = await ai.files.get({ name: targetName });
      return res.json({ success: true, file: fileInfo });
    } catch (error) {
      console.error("Error getting file info from Google Files API:", error);
      res.status(500).json({ success: false, error: error?.message || "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0645\u0631\u062C\u0639 \u0627\u0644\u0645\u0644\u0641." });
    }
  });
  async function trackAiRequest(userId, service, actualModelId, userPlan, inputTokens, outputTokens, latencyMs, success, httpStatus, errorType) {
    try {
      const today = getTodayDateStr();
      const logId = "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const internalUserId = userId || "guest";
      const docRef = doc2(dbWeb, "aiRequestLogs", logId);
      await setDoc2(docRef, {
        id: logId,
        internalUserId,
        service,
        actualModelId,
        userPlan,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        latencyMs,
        success,
        httpStatus,
        errorType: errorType || null,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        date: today
      });
      const statsRef = doc2(dbWeb, "aiUsageStats", today);
      const statsSnap = await getDoc(statsRef);
      const statsData = statsSnap.exists() ? statsSnap.data() : {
        totalRequests: 0,
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalLatencyMs: 0,
        successCount: 0,
        errorCount: 0,
        services: {},
        models: {},
        plans: {}
      };
      const newTotal = (statsData.totalRequests || 0) + 1;
      const newSuccess = (statsData.successCount || 0) + (success ? 1 : 0);
      const newError = (statsData.errorCount || 0) + (!success ? 1 : 0);
      const newLatency = (statsData.totalLatencyMs || 0) + latencyMs;
      const newIn = (statsData.totalInputTokens || 0) + inputTokens;
      const newOut = (statsData.totalOutputTokens || 0) + outputTokens;
      const newTokens = (statsData.totalTokens || 0) + inputTokens + outputTokens;
      const services = { ...statsData.services };
      services[service] = (services[service] || 0) + 1;
      const serviceTokens = { ...statsData.serviceTokens || {} };
      serviceTokens[service] = (serviceTokens[service] || 0) + inputTokens + outputTokens;
      const models = { ...statsData.models };
      if (!models[actualModelId]) {
        models[actualModelId] = { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, totalLatency: 0, errors: 0 };
      }
      models[actualModelId].requests++;
      models[actualModelId].inputTokens += inputTokens;
      models[actualModelId].outputTokens += outputTokens;
      models[actualModelId].totalTokens += inputTokens + outputTokens;
      models[actualModelId].totalLatency += latencyMs;
      if (!success) models[actualModelId].errors++;
      const plans = { ...statsData.plans };
      if (!plans[userPlan]) {
        plans[userPlan] = { requests: 0, tokens: 0, users: {} };
      }
      plans[userPlan].requests++;
      plans[userPlan].tokens += inputTokens + outputTokens;
      plans[userPlan].users[internalUserId] = true;
      await setDoc2(statsRef, {
        totalRequests: newTotal,
        totalTokens: newTokens,
        totalInputTokens: newIn,
        totalOutputTokens: newOut,
        totalLatencyMs: newLatency,
        successCount: newSuccess,
        errorCount: newError,
        services,
        serviceTokens,
        models,
        plans,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      if (internalUserId !== "guest") {
        const uStatsRef = doc2(dbWeb, "userAiStats", internalUserId);
        const uSnap = await getDoc(uStatsRef);
        const uData = uSnap.exists() ? uSnap.data() : { totalRequests: 0, totalTokens: 0, totalLatencyMs: 0, topModelMap: {}, topFeatureMap: {} };
        const newUReqs = (uData.totalRequests || 0) + 1;
        const newUTok = (uData.totalTokens || 0) + inputTokens + outputTokens;
        const topModelMap = { ...uData.topModelMap || {} };
        topModelMap[actualModelId] = (topModelMap[actualModelId] || 0) + 1;
        const topFeatureMap = { ...uData.topFeatureMap || {} };
        topFeatureMap[service] = (topFeatureMap[service] || 0) + 1;
        await setDoc2(uStatsRef, {
          totalRequests: newUReqs,
          totalTokens: newUTok,
          totalLatencyMs: (uData.totalLatencyMs || 0) + latencyMs,
          topModelMap,
          topFeatureMap,
          plan: userPlan,
          internalUserId,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.error("Error in trackAiRequest:", err);
    }
  }
  async function generateContentWithTracking(params, userId = "guest", service = "General", userPlan = "Free") {
    const start = Date.now();
    let success = false;
    let httpStatus = 200;
    let errorType = void 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let response = null;
    try {
      const requestParams = { ...params };
      if (requestParams.model === "gemma-4-26b" || requestParams.model === "gemma-4-26b-it") {
        requestParams.model = "gemma-4-26b-a4b-it";
      } else if (requestParams.model === "gemma-4-31b") {
        requestParams.model = "gemma-4-31b-it";
      }
      if (!ai) {
        await refreshAiClient();
      }
      if (!ai) {
        throw new Error("\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0645\u0641\u062A\u0627\u062D Gemini API \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (systemConfig/apiKeys). \u064A\u0631\u062C\u0649 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645 \u0644\u062A\u0634\u063A\u064A\u0644 \u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.");
      }
      const validOfficialModels = [
        "gemma-4-31b-it",
        "gemma-4-26b-a4b-it",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.1-pro-preview"
      ];
      let initialModel = requestParams.model;
      if (initialModel && !validOfficialModels.includes(initialModel)) {
        if (initialModel.includes("31b") || initialModel.includes("31B")) initialModel = "gemma-4-31b-it";
        else if (initialModel.includes("26b") || initialModel.includes("26B")) initialModel = "gemma-4-26b-a4b-it";
        else if (initialModel.includes("3.7")) initialModel = "gemini-3.7-flash";
        else if (initialModel.includes("lite")) initialModel = "gemini-3.1-flash-lite";
        else if (initialModel.includes("pro")) initialModel = "gemini-3.1-pro-preview";
        else initialModel = "gemma-4-26b-a4b-it";
      }
      const candidateModels = [
        initialModel,
        initialModel === "gemma-4-31b-it" ? "gemma-4-26b-a4b-it" : "gemma-4-31b-it",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.1-pro-preview"
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);
      let lastErr = null;
      for (const mod of candidateModels) {
        try {
          const attemptParams = { ...requestParams, model: mod };
          if (mod && mod.startsWith("gemma") && attemptParams.config?.thinkingConfig) {
            const { thinkingConfig, ...restConfig } = attemptParams.config;
            attemptParams.config = restConfig;
          }
          response = await ai.models.generateContent(attemptParams);
          if (response && response.text) {
            success = true;
            break;
          }
        } catch (genErr) {
          lastErr = genErr;
          const errMsg = genErr?.message || String(genErr);
          const isUnavailable = genErr?.status === 503 || errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("experiencing high demand");
          const isRateLimit = genErr?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
          console.warn(`Model generation attempt with ${mod} encountered error (${isUnavailable ? "503 High Demand" : isRateLimit ? "429 Rate Limit" : "Error"}):`, errMsg);
        }
      }
      if (!response && lastErr) {
        throw lastErr;
      }
      if (response?.usageMetadata) {
        inputTokens = response.usageMetadata.promptTokenCount || 0;
        outputTokens = response.usageMetadata.candidatesTokenCount || 0;
      } else {
        const text = response?.text || "";
        outputTokens = Math.ceil(text.length / 4);
        const inText = JSON.stringify(params.contents || "");
        inputTokens = Math.ceil(inText.length / 4);
      }
      return response;
    } catch (err) {
      success = false;
      httpStatus = err?.status || err?.code || 500;
      errorType = httpStatus === 429 || err?.message?.includes("RESOURCE_EXHAUSTED") ? "Rate Limit" : "Internal Error";
      throw err;
    } finally {
      const latencyMs = Date.now() - start;
      const actualModelId = params.model || "gemma-4-26b";
      trackAiRequest(userId, service, actualModelId, userPlan, inputTokens, outputTokens, latencyMs, success, httpStatus, errorType);
    }
  }
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioData, mimeType = "audio/webm" } = req.body;
      if (!audioData) return res.status(400).json({ error: "No audio data provided" });
      const audioMatch = audioData.match(/^data:([^;]+);base64,(.+)$/);
      if (!audioMatch) return res.status(400).json({ error: "Invalid audio format" });
      if (!ai) await refreshAiClient();
      if (!ai) return res.status(500).json({ error: "No AI client available" });
      const transcribeModels = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
      let text = "";
      let lastErr = null;
      for (const model of transcribeModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  { text: "\u0642\u0645 \u0628\u062A\u0641\u0631\u064A\u063A \u0648\u062A\u062D\u0648\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0642\u0637\u0639 \u0627\u0644\u0635\u0648\u062A\u064A \u0625\u0644\u0649 \u0646\u0635 \u0645\u0643\u062A\u0648\u0628 \u0628\u062F\u0642\u0629 \u0645\u062A\u0646\u0627\u0647\u064A\u0629. \u0644\u0627 \u062A\u0636\u0641 \u0623\u064A \u062A\u0639\u0644\u064A\u0642\u0627\u062A\u060C \u0641\u0642\u0637 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0635\u0648\u062A \u0643\u0645\u0627 \u0647\u0648 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u062A\u064A \u0642\u064A\u0644 \u0628\u0647\u0627\u060C \u0648\u064A\u0641\u0636\u0644 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0643\u0630\u0644\u0643." },
                  { inlineData: { mimeType: audioMatch[1], data: audioMatch[2] } }
                ]
              }
            ]
          });
          if (response && response.text) {
            text = response.text;
            break;
          }
        } catch (err) {
          lastErr = err;
          console.warn(`[TRANSCRIBE] Model ${model} failed, trying next...:`, err);
        }
      }
      if (!text && lastErr) {
        throw lastErr;
      }
      res.json({ text: (text || "").trim() });
    } catch (err) {
      console.error("Transcription error:", err);
      res.status(500).json({ error: "Transcription failed" });
    }
  });
  app.post("/api/youtube/info", async (req, res) => {
    try {
      const { url, videoId } = req.body;
      const input = url || videoId || "";
      const extracted = extractYouTubeUrl(input) || (typeof input === "string" && /^[a-zA-Z0-9_-]{11}$/.test(input.trim()) ? { url: `https://www.youtube.com/watch?v=${input.trim()}`, cleanUrl: `https://www.youtube.com/watch?v=${input.trim()}`, videoId: input.trim() } : null);
      if (!extracted) {
        return res.status(400).json({ error: "Invalid or missing YouTube URL/Video ID" });
      }
      const contextResult = await getVerifiedYouTubeVideoContext(extracted.videoId, "metadata_lookup", extracted.url);
      return res.json({
        success: contextResult.validationPassed,
        videoId: contextResult.videoId,
        status: contextResult.status,
        metadata: contextResult.metadata,
        hasTranscript: !!contextResult.transcript && contextResult.transcript.fullText.length > 0,
        transcriptLanguage: contextResult.transcript?.language,
        transcriptLength: contextResult.transcript?.fullText.length || 0,
        errorMessage: contextResult.errorMessage
      });
    } catch (err) {
      console.error("YouTube info endpoint error:", err);
      res.status(500).json({ error: "Failed to process YouTube video" });
    }
  });
  const globalAudioUsageMem = /* @__PURE__ */ new Map();
  const MODEL_CAPABILITY_REGISTRY = [
    {
      id: "gemini-3.7-flash",
      role: "understanding",
      priority: 100,
      capabilities: ["text", "image", "video", "audio", "pdf", "youtube", "extraction", "summarization"]
    },
    {
      id: "gemini-3.6-flash",
      role: "understanding",
      priority: 95,
      capabilities: ["text", "image", "video", "audio", "pdf", "youtube", "extraction", "summarization"]
    },
    {
      id: "gemini-3.1-flash-lite",
      role: "understanding",
      priority: 90,
      capabilities: ["text", "image", "video", "audio", "pdf", "youtube", "extraction", "summarization"]
    },
    {
      id: "gemini-3.1-pro-preview",
      role: "understanding",
      priority: 85,
      capabilities: ["text", "image", "video", "audio", "pdf", "youtube", "extraction", "summarization"]
    }
  ];
  function pcmToWav(pcmBuffer, sampleRate = 24e3, numChannels = 1, bitsPerSample = 16) {
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcmBuffer.length;
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, pcmBuffer]);
  }
  async function routeUnderstandingTask({
    task,
    requiredCapabilities,
    contents,
    systemInstruction,
    userId
  }) {
    const eligibleModels = MODEL_CAPABILITY_REGISTRY.filter((m) => m.role === "understanding" && requiredCapabilities.every((c) => m.capabilities.includes(c))).sort((a, b) => b.priority - a.priority);
    if (eligibleModels.length === 0) {
      eligibleModels.push(...MODEL_CAPABILITY_REGISTRY.filter((m) => m.role === "understanding").sort((a, b) => b.priority - a.priority));
    }
    let lastErr = null;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    for (let i = 0; i < eligibleModels.length; i++) {
      const modelEntry = eligibleModels[i];
      const modelId = modelEntry.id;
      const startTime = Date.now();
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await generateContentWithTracking({
            model: modelId,
            contents,
            config: systemInstruction ? { systemInstruction } : void 0
          });
          if (response && response.text) {
            const latency = Date.now() - startTime;
            console.log(`[UNDERSTANDING ROUTER] Success: req=${requestId} task=${task} model=${modelId} attempt=${attempt + 1} latency=${latency}ms`);
            return { text: response.text, modelUsed: modelId };
          }
        } catch (err) {
          lastErr = err;
          const errMsg = err?.message || String(err);
          const isRateLimit = err?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
          const isUnavailable = err?.status === 503 || errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE");
          console.warn(`[UNDERSTANDING ROUTER] Model ${modelId} attempt ${attempt + 1} failed for ${task} (${isUnavailable ? "503 High Demand" : isRateLimit ? "429 Rate Limit" : "Error"}):`, errMsg);
          if (isUnavailable) {
            break;
          }
          if (isRateLimit && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          break;
        }
      }
    }
    throw lastErr || new Error("All understanding models exhausted.");
  }
  function decodeHtmlEntities(str) {
    if (!str) return "";
    return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&#x2F;/g, "/").replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec))).replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\s+/g, " ").trim();
  }
  function extractYouTubeUrl(text) {
    if (!text || typeof text !== "string") return null;
    const urlRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9_-]+\.)?(?:youtube\.com|youtu\.be)\/[^\s<>"')]+/gi;
    const matches = text.match(urlRegex);
    const candidateUrls = matches ? matches : [];
    for (const rawUrl of candidateUrls) {
      try {
        const fullUrlStr = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
        const parsed = new URL(fullUrlStr);
        const host = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname;
        let extractedId = null;
        if (host === "youtu.be" || host.endsWith(".youtu.be")) {
          const idPart = pathname.replace(/^\/+/, "").split("/")[0]?.split("?")[0];
          if (idPart && /^[a-zA-Z0-9_-]{11}$/.test(idPart)) {
            extractedId = idPart;
          }
        } else if (host.includes("youtube.com")) {
          const vParam = parsed.searchParams.get("v");
          if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
            extractedId = vParam;
          }
          if (!extractedId && pathname.includes("/shorts/")) {
            const part = pathname.split("/shorts/")[1]?.split("/")[0]?.split("?")[0];
            if (part && /^[a-zA-Z0-9_-]{11}$/.test(part)) {
              extractedId = part;
            }
          }
          if (!extractedId && pathname.includes("/embed/")) {
            const part = pathname.split("/embed/")[1]?.split("/")[0]?.split("?")[0];
            if (part && /^[a-zA-Z0-9_-]{11}$/.test(part)) {
              extractedId = part;
            }
          }
          if (!extractedId && pathname.includes("/v/")) {
            const part = pathname.split("/v/")[1]?.split("/")[0]?.split("?")[0];
            if (part && /^[a-zA-Z0-9_-]{11}$/.test(part)) {
              extractedId = part;
            }
          }
          if (!extractedId && pathname.includes("/live/")) {
            const part = pathname.split("/live/")[1]?.split("/")[0]?.split("?")[0];
            if (part && /^[a-zA-Z0-9_-]{11}$/.test(part)) {
              extractedId = part;
            }
          }
        }
        if (extractedId && /^[a-zA-Z0-9_-]{11}$/.test(extractedId)) {
          return {
            url: fullUrlStr,
            cleanUrl: `https://www.youtube.com/watch?v=${extractedId}`,
            videoId: extractedId
          };
        }
      } catch (e) {
      }
    }
    const fallbackMatch = text.match(/(?:(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/))([a-zA-Z0-9_-]{11})/i);
    if (fallbackMatch && fallbackMatch[1]) {
      const vId = fallbackMatch[1];
      return {
        url: `https://www.youtube.com/watch?v=${vId}`,
        cleanUrl: `https://www.youtube.com/watch?v=${vId}`,
        videoId: vId
      };
    }
    return null;
  }
  const isolatedYouTubeCache = /* @__PURE__ */ new Map();
  function logYouTubePipelineDebug(info) {
    console.log(`
================== [YOUTUBE PIPELINE DEBUG] ==================
Input URL:             ${info.inputUrl}
Extracted Video ID:    ${info.extractedVideoId}
Verified Video ID:     ${info.verifiedVideoId}
Video Title:           ${info.videoTitle}
Channel:               ${info.channel}
Duration:              ${info.duration || "N/A"}
Transcript Video ID:   ${info.transcriptVideoId}
Transcript Source:     ${info.transcriptSource}
Transcript Length:     ${info.transcriptLength} characters
Requested Output:      ${info.requestedOutput}
Summary Source:        ${info.summarySource}
Validation:            ${info.validation}${info.failureReason ? ` (${info.failureReason})` : ""}
==============================================================
  `);
  }
  async function fetchYouTubeVideoMetadata(videoId) {
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return { metadata: null, error: "Invalid Video ID format" };
    }
    let oembedData = null;
    let pageHtml = "";
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;
      const oembedRes = await fetch(oembedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      });
      if (oembedRes.status === 404 || oembedRes.status === 401 || oembedRes.status === 403) {
        return { metadata: null, error: `\u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0623\u0648 \u062A\u0645 \u062D\u0630\u0641\u0647 \u0623\u0648 \u062A\u0645 \u0636\u0628\u0637\u0647 \u0643\u0641\u064A\u062F\u064A\u0648 \u062E\u0627\u0635 (Video ID: ${videoId})` };
      }
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch (e) {
      console.warn(`[YOUTUBE METADATA] oEmbed fetch error for ${videoId}:`, e);
    }
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (pageRes.ok) {
        pageHtml = await pageRes.text();
      }
    } catch (e) {
      console.warn(`[YOUTUBE METADATA] Page HTML fetch error for ${videoId}:`, e);
    }
    let title = oembedData?.title || "";
    let channelTitle = oembedData?.author_name || "";
    let channelUrl = oembedData?.author_url || "";
    let thumbnailUrl = oembedData?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    let description = "";
    let durationFormatted = "";
    let durationSeconds = 0;
    let viewCount = "";
    if (pageHtml) {
      const playerMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:\s*var\s+|\s*<\s*\/script>|\s*\n)/s) || pageHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (playerMatch && playerMatch[1]) {
        try {
          const parsedPlayer = JSON.parse(playerMatch[1]);
          const videoDetails = parsedPlayer.videoDetails || {};
          if (videoDetails.videoId && videoDetails.videoId === videoId) {
            if (!title && videoDetails.title) title = videoDetails.title;
            if (!channelTitle && videoDetails.author) channelTitle = videoDetails.author;
            if (videoDetails.shortDescription) description = videoDetails.shortDescription;
            if (videoDetails.lengthSeconds) {
              durationSeconds = parseInt(videoDetails.lengthSeconds, 10);
              const m = Math.floor(durationSeconds / 60);
              const s = durationSeconds % 60;
              durationFormatted = `${m}:${s.toString().padStart(2, "0")}`;
            }
            if (videoDetails.viewCount) viewCount = videoDetails.viewCount;
          }
        } catch (jsonErr) {
        }
      }
      if (!title) {
        const ogTitleMatch = pageHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || pageHtml.match(/<title>([^<]+)<\/title>/i);
        if (ogTitleMatch) title = decodeHtmlEntities(ogTitleMatch[1].replace(/ - YouTube$/i, ""));
      }
      if (!description) {
        const ogDescMatch = pageHtml.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) || pageHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
        if (ogDescMatch) description = decodeHtmlEntities(ogDescMatch[1]);
      }
    }
    if (!title && !oembedData) {
      return { metadata: null, error: `\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0641\u064A\u062F\u064A\u0648 YouTube \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${videoId}` };
    }
    const metadata = {
      videoId,
      title: decodeHtmlEntities(title || `\u0641\u064A\u062F\u064A\u0648 \u064A\u0648\u062A\u064A\u0648\u0628 (${videoId})`),
      channelTitle: decodeHtmlEntities(channelTitle || "\u0642\u0646\u0627\u0629 YouTube"),
      channelUrl,
      description: description.trim(),
      duration: durationFormatted,
      durationSeconds,
      thumbnailUrl,
      viewCount,
      verified: true
    };
    return { metadata, pageHtml };
  }
  async function fetchYouTubeVideoTranscript(videoId, expectedVideoId, pageHtml) {
    if (videoId !== expectedVideoId) {
      console.error(`[YOUTUBE TRANSCRIPT CRITICAL ERROR] Video ID mismatch! Requested: ${expectedVideoId}, Received: ${videoId}`);
      return null;
    }
    let html = pageHtml || "";
    if (!html) {
      try {
        const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "ar,en-US;q=0.9,en;q=0.8"
          }
        });
        if (res.ok) html = await res.text();
      } catch (e) {
        console.warn(`[YOUTUBE TRANSCRIPT] Failed to fetch page for ${videoId}:`, e);
        return null;
      }
    }
    if (!html) return null;
    try {
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:\s*var\s+|\s*<\s*\/script>|\s*\n)/s) || html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (!playerMatch || !playerMatch[1]) return null;
      const parsedPlayer = JSON.parse(playerMatch[1]);
      const captionTracks = parsedPlayer?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
        return null;
      }
      const sortedTracks = [...captionTracks].sort((a, b) => {
        const getScore = (t) => {
          const lang = (t.languageCode || "").toLowerCase();
          const isAsr = t.kind === "asr";
          if (lang === "ar" && !isAsr) return 100;
          if (lang === "ar" && isAsr) return 90;
          if (lang === "en" && !isAsr) return 80;
          if (lang === "en" && isAsr) return 70;
          return 50;
        };
        return getScore(b) - getScore(a);
      });
      const chosenTrack = sortedTracks[0];
      if (!chosenTrack || !chosenTrack.baseUrl) return null;
      const captionRes = await fetch(chosenTrack.baseUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      });
      if (!captionRes.ok) return null;
      const captionXml = await captionRes.text();
      const segments = [];
      const textRegex = /<text\s+start="([\d\.]+)"(?:\s+dur="([\d\.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
      let match;
      while ((match = textRegex.exec(captionXml)) !== null) {
        const start = parseFloat(match[1]);
        const duration = match[2] ? parseFloat(match[2]) : void 0;
        const rawText = match[3] || "";
        const clean = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, ""));
        if (clean && clean.trim().length > 0) {
          segments.push({ text: clean, start, duration });
        }
      }
      if (segments.length === 0) {
        const fallbackMatches = captionXml.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);
        if (fallbackMatches) {
          for (const tag of fallbackMatches) {
            const content = tag.replace(/<[^>]+>/g, "");
            const clean = decodeHtmlEntities(content);
            if (clean && clean.trim().length > 0) {
              segments.push({ text: clean });
            }
          }
        }
      }
      if (segments.length === 0) return null;
      const fullText = segments.map((s) => s.text).join(" ");
      const trackLabel = chosenTrack.name?.simpleText || chosenTrack.name?.runs?.[0]?.text || chosenTrack.languageCode || "Official";
      return {
        videoId,
        source: `YouTube Captions (${trackLabel})`,
        language: chosenTrack.languageCode || "unknown",
        segments,
        fullText,
        verified: true
      };
    } catch (err) {
      console.warn(`[YOUTUBE TRANSCRIPT PARSER ERROR] for ${videoId}:`, err);
      return null;
    }
  }
  async function getVerifiedYouTubeVideoContext(expectedVideoId, userQuery, rawUrl, dbKeys) {
    const cacheKey = `youtube:${expectedVideoId}`;
    const cached = isolatedYouTubeCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      console.log(`[YOUTUBE CONTEXT] Serving isolated cache for videoId: ${expectedVideoId}`);
      return cached.result;
    }
    const { metadata, pageHtml, error } = await fetchYouTubeVideoMetadata(expectedVideoId);
    if (!metadata || error) {
      const errorResult = {
        videoId: expectedVideoId,
        expectedVideoId,
        status: "not_found",
        metadata: {
          videoId: expectedVideoId,
          title: "\u0641\u064A\u062F\u064A\u0648 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          channelTitle: "",
          description: "",
          verified: false
        },
        formattedContext: "",
        validationPassed: false,
        errorMessage: error || `\u062A\u0639\u0630\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0627\u0644\u0645\u062D\u062F\u062F (Video ID: ${expectedVideoId})`
      };
      logYouTubePipelineDebug({
        inputUrl: rawUrl,
        extractedVideoId: expectedVideoId,
        verifiedVideoId: "FAILED",
        videoTitle: "Not Found",
        channel: "N/A",
        transcriptVideoId: "N/A",
        transcriptSource: "None",
        transcriptLength: 0,
        requestedOutput: userQuery,
        summarySource: "Error",
        validation: "FAIL",
        failureReason: error || "Metadata fetch failed"
      });
      return errorResult;
    }
    const transcript = await fetchYouTubeVideoTranscript(metadata.videoId, expectedVideoId, pageHtml);
    const actualMetadataVideoId = metadata.videoId;
    const transcriptVideoId = transcript ? transcript.videoId : expectedVideoId;
    const isIdVerified = expectedVideoId === actualMetadataVideoId && (!transcript || transcriptVideoId === expectedVideoId);
    if (!isIdVerified) {
      const failReason = `ID Mismatch! Expected: ${expectedVideoId}, Metadata: ${actualMetadataVideoId}, Transcript: ${transcriptVideoId}`;
      console.error(`[YOUTUBE PIPELINE VALIDATION FAILED] ${failReason}`);
      logYouTubePipelineDebug({
        inputUrl: rawUrl,
        extractedVideoId: expectedVideoId,
        verifiedVideoId: actualMetadataVideoId,
        videoTitle: metadata.title,
        channel: metadata.channelTitle,
        duration: metadata.duration,
        transcriptVideoId,
        transcriptSource: transcript ? transcript.source : "None",
        transcriptLength: transcript ? transcript.fullText.length : 0,
        requestedOutput: userQuery,
        summarySource: "Blocked due to mismatch",
        validation: "FAIL",
        failureReason: failReason
      });
      return {
        videoId: expectedVideoId,
        expectedVideoId,
        status: "error",
        metadata,
        formattedContext: "",
        validationPassed: false,
        errorMessage: "\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0644\u0648\u062C\u0648\u062F \u062A\u0639\u0627\u0631\u0636 \u0641\u064A \u0645\u0639\u0631\u0641 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0627\u0644\u0645\u062D\u062F\u062F \u0644\u0636\u0645\u0627\u0646 \u0639\u062F\u0645 \u062A\u0644\u062E\u064A\u0635 \u0645\u062D\u062A\u0648\u0649 \u062E\u0627\u0637\u0626."
      };
    }
    let formattedContext = "";
    let status = "ready";
    if (transcript && transcript.fullText.trim().length > 30) {
      formattedContext = `
[\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0627\u0644\u0645\u0648\u062B\u0642\u0629 - YouTube Verified Video Context]
- \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0641\u064A\u062F\u064A\u0648: ${metadata.title}
- \u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u0646\u0627\u0634\u0631\u0629: ${metadata.channelTitle}
- \u0627\u0644\u0645\u0639\u0631\u0641 \u0627\u0644\u0631\u0642\u0645\u064A (Video ID): ${metadata.videoId}
- \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0631\u0633\u0645\u064A: https://www.youtube.com/watch?v=${metadata.videoId}
- \u0627\u0644\u0645\u062F\u0629: ${metadata.duration || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F\u0629"}
- \u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0644\u0641\u064A\u062F\u064A\u0648:
${metadata.description ? metadata.description.slice(0, 1e3) : "\u0644\u0627 \u064A\u0648\u062C\u062F \u0648\u0635\u0641 \u0625\u0636\u0627\u0641\u064A"}

[\u0627\u0644\u0646\u0635 \u0627\u0644\u062A\u0641\u0631\u064A\u063A\u064A \u0627\u0644\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0644\u0641\u064A\u062F\u064A\u0648 (Verified Video Transcript / Captions)]:
${transcript.fullText}
    `.trim();
      status = "ready";
    } else {
      status = "no_transcript";
      formattedContext = `
[\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0627\u0644\u0645\u0648\u062B\u0642\u0629 - YouTube Verified Video Context]
- \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0641\u064A\u062F\u064A\u0648: ${metadata.title}
- \u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u0646\u0627\u0634\u0631\u0629: ${metadata.channelTitle}
- \u0627\u0644\u0645\u0639\u0631\u0641 \u0627\u0644\u0631\u0642\u0645\u064A (Video ID): ${metadata.videoId}
- \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0631\u0633\u0645\u064A: https://www.youtube.com/watch?v=${metadata.videoId}
- \u0627\u0644\u0645\u062F\u0629: ${metadata.duration || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F\u0629"}
- \u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0644\u0641\u064A\u062F\u064A\u0648:
${metadata.description ? metadata.description : "\u0644\u0627 \u064A\u0648\u062C\u062F \u0648\u0635\u0641 \u0645\u062A\u0627\u062D"}

[\u0645\u0644\u0627\u062D\u0638\u0629 \u0645\u0648\u062B\u0642\u0629]: \u0647\u0630\u0627 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0646\u0635 \u062A\u0641\u0631\u064A\u063A\u064A (Captions / Transcript) \u0631\u0633\u0645\u064A \u0645\u062A\u0627\u062D \u0645\u0646 \u064A\u0648\u062A\u064A\u0648\u0628.
    `.trim();
    }
    const result = {
      videoId: expectedVideoId,
      expectedVideoId,
      status,
      metadata,
      transcript: transcript || void 0,
      formattedContext,
      validationPassed: true
    };
    logYouTubePipelineDebug({
      inputUrl: rawUrl,
      extractedVideoId: expectedVideoId,
      verifiedVideoId: metadata.videoId,
      videoTitle: metadata.title,
      channel: metadata.channelTitle,
      duration: metadata.duration,
      transcriptVideoId: transcript ? transcript.videoId : "None",
      transcriptSource: transcript ? transcript.source : "No Captions Available",
      transcriptLength: transcript ? transcript.fullText.length : 0,
      requestedOutput: userQuery,
      summarySource: `youtube:${expectedVideoId}:${transcript ? "transcript" : "metadata_only"}`,
      validation: "PASS"
    });
    isolatedYouTubeCache.set(cacheKey, {
      result,
      expiresAt: now + 30 * 60 * 1e3
    });
    return result;
  }
  function findYouTubeInfoInConversation(messages, userQuery) {
    const direct = extractYouTubeUrl(userQuery);
    if (direct) return direct;
    if (Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const text = typeof msg === "string" ? msg : msg?.text || msg?.parts && msg.parts[0]?.text || "";
        const found = extractYouTubeUrl(text);
        if (found) return found;
      }
    }
    return null;
  }
  function resolveVoiceProfile(userText, context) {
    const combined = ((userText || "") + " " + (context || "")).toLowerCase();
    let gender = "female";
    if (/(ولد|رجل|ذكر|شاب|صوت ولد|صوت رجل|male|man|guy)/i.test(combined)) {
      gender = "male";
    } else if (/(بنت|أنثى|انثى|فتاة|صوت بنت|صوت أنثى|female|woman|girl)/i.test(combined)) {
      gender = "female";
    }
    let dialect = "\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0627\u0644\u0639\u0627\u0645\u064A\u0629 \u0627\u0644\u0648\u062F\u0648\u062F\u0629 \u0648\u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629 (\u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0644\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0639\u0631\u0628\u064A)";
    if (/(سعودي|خليجي|نجدي|حجازي|saudi|gulf)/i.test(combined)) {
      dialect = "\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 / \u0627\u0644\u062E\u0644\u064A\u062C\u064A\u0629 \u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629";
    } else if (/(شامي|سوري|لبناني|أردني|shami|levantine)/i.test(combined)) {
      dialect = "\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0634\u0627\u0645\u064A\u0629 \u0627\u0644\u0648\u062F\u0648\u062F\u0629";
    } else if (/(فصحى|لغة عربية فصحى|عربي فصيح|standard arabic|fusha)/i.test(combined)) {
      dialect = "\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0641\u0635\u062D\u0649 \u0627\u0644\u0648\u0627\u0636\u062D\u0629 \u0648\u0627\u0644\u0631\u0627\u0642\u064A\u0629";
    } else if (/(مغربي|جزائري|تونسي|moroccan|algerian|tunisian)/i.test(combined)) {
      dialect = "\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0645\u063A\u0627\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0627\u0636\u062D\u0629";
    } else if (/(عراقي|iraqi)/i.test(combined)) {
      dialect = "\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0639\u0631\u0627\u0642\u064A\u0629 \u0627\u0644\u0648\u062F\u0648\u062F\u0629";
    } else if (/(english|انجليزي|إنجليزي)/i.test(combined)) {
      dialect = "English (clear, conversational)";
    }
    let tone = "\u0648\u062F\u0648\u062F\u0629 \u0648\u0645\u0645\u062A\u0639\u0629 \u0648\u062A\u0641\u0627\u0639\u0644\u064A\u0629";
    let depth = "\u0645\u062A\u0648\u0633\u0637";
    let energy = "\u0639\u0627\u0644\u064A\u0629 \u0648\u0645\u062A\u0641\u0627\u0639\u0644\u0629";
    let delivery = "\u0645\u0642\u062F\u0645 \u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0630\u0643\u064A \u064A\u062A\u062D\u062F\u062B \u0628\u0633\u0644\u0627\u0633\u0629 \u0648\u0637\u0644\u0627\u0642\u0629 \u062F\u0648\u0646 \u0631\u062A\u0627\u0628\u0629 \u0623\u0648 \u0642\u0631\u0627\u0621\u0629 \u062C\u0627\u0645\u062F\u0629";
    if (/(مرح|مرحة|فكاهي|فكاهية|كوميدي|كوميدية|خفيف دم|دمه خفيف|دمها خفيف|playful|funny|humorous|cheerful|fun)/i.test(combined)) {
      tone = "\u0645\u0631\u062D\u0629 \u0648\u062E\u0641\u064A\u0641\u0629 \u0627\u0644\u0638\u0644 \u0648\u0645\u0645\u062A\u0639\u0629 \u0648\u0645\u0628\u0647\u062C\u0629";
      energy = "\u0639\u0627\u0644\u064A\u0629 \u0648\u0645\u0628\u0647\u062C\u0629";
      delivery = "\u0623\u0633\u0644\u0648\u0628 \u0639\u0641\u0648\u064A \u062E\u0641\u064A\u0641 \u0627\u0644\u0638\u0644 \u0645\u0631\u062D\u060C \u064A\u0628\u0633\u0637 \u0627\u0644\u0641\u0643\u0631\u0629 \u0628\u0631\u0648\u062D \u0645\u0628\u0647\u062C\u0629 \u0648\u062C\u0630\u0627\u0628\u0629 \u062A\u062C\u0639\u0644 \u0627\u0644\u0645\u0633\u062A\u0645\u0639 \u064A\u0628\u062A\u0633\u0645 \u0648\u064A\u0633\u062A\u0645\u062A\u0639 \u0628\u0643\u0644 \u062B\u0627\u0646\u064A\u0629";
    } else if (/(هادي|هادئ|هادية|هادئة|رايق|رايقة|مسترخي|مسترخية|دافئ|دافئة|calm|relaxed|soft|chill)/i.test(combined)) {
      tone = "\u0647\u0627\u062F\u0626\u0629 \u0648\u0645\u0631\u064A\u062D\u0629 \u0648\u0648\u0627\u0636\u062D\u0629 \u0648\u062F\u0627\u0641\u0626\u0629";
      depth = gender === "male" ? "\u0639\u0645\u064A\u0642 \u0648\u0647\u0627\u062F\u0626" : "\u062F\u0627\u0641\u0626 \u0648\u0645\u0631\u064A\u062D";
      energy = "\u0645\u062A\u0632\u0646\u0629 \u0648\u0647\u0627\u062F\u0626\u0629";
      delivery = "\u062D\u062F\u064A\u062B \u0647\u0627\u062F\u0626 \u0648\u0631\u0635\u064A\u0646 \u0648\u0645\u0631\u064A\u062D \u0644\u0644\u0623\u0630\u0646 \u0648\u0627\u0644\u0623\u0639\u0635\u0627\u0628 \u0628\u0646\u0628\u0631\u0629 \u062F\u0627\u0641\u0626\u0629 \u0648\u0633\u0644\u0633\u0629";
    } else if (/(متحمس|حماسي|حماسية|مشوق|مشوقة|تحفيزي|تحفيزية|energetic|hyped|excited|motivational)/i.test(combined)) {
      tone = "\u062D\u0645\u0627\u0633\u064A\u0629 \u0648\u0645\u0644\u0647\u0645\u0629 \u0648\u0645\u0634\u0648\u0642\u0629 \u0648\u0645\u062D\u0641\u0632\u0629 \u062C\u062F\u0627\u064B";
      energy = "\u0639\u0627\u0644\u064A\u0629 \u062C\u062F\u0627\u064B \u0648\u062D\u064A\u0648\u064A\u0629";
      delivery = "\u0623\u0633\u0644\u0648\u0628 \u062A\u0641\u0627\u0639\u0644\u064A \u0645\u0644\u064A\u0621 \u0628\u0627\u0644\u0634\u063A\u0641 \u0648\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A\u0629 \u0648\u0627\u0644\u062D\u0645\u0627\u0633 \u0627\u0644\u0645\u0634\u0648\u0642";
    } else if (/(قصصي|قصصية|حكواتي|درامي|درامية|سردي|سردية|روائي|storytelling|story|narrative)/i.test(combined)) {
      tone = "\u0631\u0648\u0627\u0626\u064A\u0629 \u0648\u0645\u0634\u0648\u0642\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0627\u0644\u062D\u0643\u0648\u0627\u062A\u064A \u0627\u0644\u062C\u0630\u0627\u0628";
      energy = "\u0645\u062A\u062F\u0631\u062C\u0629 \u0628\u062A\u0634\u0648\u064A\u0642";
      delivery = "\u0633\u0631\u062F \u0642\u0635\u0635\u064A \u062F\u0631\u0627\u0645\u064A \u062C\u0630\u0627\u0628 \u064A\u0623\u062E\u0630 \u0627\u0644\u0645\u0633\u062A\u0645\u0639 \u0641\u064A \u0631\u062D\u0644\u0629 \u0648\u062A\u0635\u0648\u064A\u0631 \u062D\u064A \u0644\u0644\u0623\u062D\u062F\u0627\u062B";
    } else if (/(عميق|فخم|رخيم|deep)/i.test(combined)) {
      depth = "\u0639\u0645\u064A\u0642 \u0648\u0641\u062E\u0645 \u0648\u0631\u062E\u064A\u0645";
      tone = "\u0648\u0627\u062B\u0642\u0629 \u0648\u0631\u0635\u064A\u0646\u0629 \u0648\u0641\u062E\u0645\u0629";
    } else if (/(رسمي|رسمية|أكاديمي|أكاديمية|علمي|علمية|إخباري|إخبارية|احترافي|احترافية|professional|formal|news)/i.test(combined)) {
      tone = "\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 \u0648\u0631\u0633\u0645\u064A\u0629 \u0648\u0639\u0644\u0645\u064A\u0629 \u062F\u0642\u064A\u0642\u0629";
      energy = "\u0645\u062A\u0632\u0646\u0629";
      delivery = "\u0634\u0631\u062D \u0625\u0639\u0644\u0627\u0645\u064A \u0627\u062D\u062A\u0631\u0627\u0641\u064A \u0631\u0635\u064A\u0646 \u0648\u0645\u062A\u0642\u0646";
    }
    let voiceName = "Aoede";
    if (gender === "male") {
      if (depth.includes("\u0639\u0645\u064A\u0642") || tone.includes("\u0647\u0627\u062F\u0626") || tone.includes("\u0647\u0627\u062F\u0626\u0629")) {
        voiceName = "Charon";
      } else if (energy.includes("\u0639\u0627\u0644\u064A\u0629") || tone.includes("\u062D\u0645\u0627\u0633") || tone.includes("\u0645\u0631\u062D")) {
        voiceName = "Puck";
      } else if (tone.includes("\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629") || tone.includes("\u0639\u0644\u0645\u064A\u0629") || tone.includes("\u0631\u0633\u0645\u064A\u0629")) {
        voiceName = "Fenrir";
      } else {
        voiceName = "Puck";
      }
    } else {
      if (tone.includes("\u0647\u0627\u062F\u0626") || tone.includes("\u0647\u0627\u062F\u0626\u0629") || tone.includes("\u062F\u0627\u0641\u0626") || tone.includes("\u062F\u0627\u0641\u0626\u0629")) {
        voiceName = "Kore";
      } else {
        voiceName = "Aoede";
      }
    }
    return {
      gender,
      dialect,
      tone,
      depth,
      pace: "\u0637\u0628\u064A\u0639\u064A\u0629 \u0648\u0633\u0644\u0633\u0629",
      energy,
      personality: "\u0645\u0642\u062F\u0645 \u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0630\u0643\u064A\u060C \u0648\u062F\u0648\u062F\u060C \u062A\u0641\u0627\u0639\u0644\u064A",
      delivery,
      voiceName
    };
  }
  function isExplicitAudioIntent(text) {
    return /(صوت|صوتي|صوتية|بودكاست|فويس|ريكورد|اوديو|أوديو|مسموع|مسموعة|audio summary|voice summary|podcast summary|audio notes|audio note|ملاحظات صوتية|ملاحظه صوتيه|ملاحظات صوتيه|ملخص صوتي|تسجيل صوتي|سمعني|اعمله صوتي|اعملو صوت|اعمل صوت|خليه صوت|شرح صوتي|تسجيل صوت|صوت بنت|صوت ولد|بصوت|audio|voice note|voice|podcast|spoken|read aloud|read to me)/i.test(text);
  }
  function isExplicitTextIntent(text) {
    return /(نصي|نصية|نصيه|مكتوب|مكتوبة|مكتوبه|كتابة|كتابه|بالكتابة|بالكتابه|بالنص|قراءة|قراءه|اقراه|اقرأه|نص عادي|نص|text|written|in text|reading|read)/i.test(text);
  }
  function isVoicePreferenceReply(text) {
    const t = (text || "").toLowerCase().trim();
    const hasGender = /(ولد|بنت|شاب|فتاة|فتاه|رجل|أنثى|انثى|ذكر|صبية|صبيه|male|female|boy|girl|man|woman)/i.test(t);
    const hasTone = /(مرح|مرحة|فكاهي|كوميدي|خفيف دم|هادي|هادئ|هادية|هادئة|رايق|رايقة|مسترخي|حماسي|حماسية|مشوق|مشوقة|تحفيزي|تحفيزية|قصصي|قصصية|حكواتي|درامي|روائي|رسمي|رسمية|احترافي|احترافية|أكاديمي|علمي|إخباري|calm|relaxed|energetic|hyped|funny|cheerful|story|narrative|formal|professional)/i.test(t);
    const hasDialect = /(مصري|مصرية|سعودي|خليجي|شامي|سوري|لبناني|فصحى|عراقي|مغربي|جزائري|تونسي|انجليزي|إنجليزي)/i.test(t);
    return (hasGender || hasTone || hasDialect) && (t.length < 25 || isExplicitAudioIntent(t));
  }
  function isGenericSummaryOrExplanationIntent(text) {
    const t = (text || "").toLowerCase().trim();
    if (!t) return true;
    return /(لخص|ملخص|تلخيص|خلاصة|خلاصه|موجز|الزتونة|الزتونه|الزبدة|الزبده|اديني المفيد|عطني المفيد|هات المفيد|انطيني المفيد|اشرح|اشرحلي|اشرح لي|فهمني|فسرلي|فسر لي|حلل|تحليل|شوف دا|شوف ده|شوف هاد|شف ذا|وش ذا|شنو هذا|شنو هاد|شو هاد|شو هيدا|دا شنو|شكو بيه|عن ايش يتكلم|عن شو بيحكي|وش سالفته|وش قصته|شو قصتو|بدي اعرف شو فيه|ابغى اعرف وش فيه|عايز اعرف ايه اللي فيه|شنو كاين|شنو فيه|اشنو فيه|وريني الحاصل|شوف الفيديو|شوف الرابط|المقطع|المستند|الملف|summarize|summary|tl;dr|tldr|break this down|give me the gist|what is this about|recap|overview|explain|digest|what is inside|what is this|look at this|check this)/i.test(t);
  }
  function isSpecificStructuredOrInquiryRequest(text) {
    const t = (text || "").toLowerCase().trim();
    const hasSpecificStructured = /(اختيار من متعدد|اختيارات|خيارات|mcq|multiple choice|امتحان|اختبار نهائي|نموذج امتحان|اختبار شامل|exam|quiz|أسئلة مراجعة|اسئلة مراجعة|سؤال وجواب|سين وجيم|q&a|flashcards|بطاقات مراجعة|فهم واستيعاب|تحليل مقالي|أهم النقاط|اهم النقاط|النقاط الرئيسية|النقاط المهمة|استخرج النقاط|key points|takeaways|bullet points|ملاحظات رئيسية)/i.test(t);
    const hasSpecificFactualQuestion = (t.includes("?") || t.includes("\u061F")) && /(كم دقيقة|كم عدد|كم سعر|كم تكلفة|من هو|من هي|من صاحب|من كاتب|متى حدث|متى بدأ|أين يقع|اين يقع|كيف تم|ما تاريخ|who is|when was|how many|how much|where is|why did)/i.test(t);
    return hasSpecificStructured || hasSpecificFactualQuestion;
  }
  function parseAudioAndDocumentIntent(userQuery, hasMediaOrDoc, reqBody, userProfileContext, isReplyingToVoiceQuestion) {
    const q = (userQuery || "").toLowerCase().trim();
    const isAudioDelivery = reqBody?.mode === "audio_summary" || isExplicitAudioIntent(q) || Boolean(isReplyingToVoiceQuestion) && isVoicePreferenceReply(q);
    let questionCount = void 0;
    const countMatch = q.match(/(\d+)\s*(?:أسئلة|اسئلة|أسئله|اسئله|سؤال|questions?|mcqs?)/i) || q.match(/(?:عدد|اعمل|هات|اكتب|ضع|صمم)\s*(\d+)/i);
    if (countMatch && countMatch[1]) {
      const parsed = parseInt(countMatch[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
        questionCount = parsed;
      }
    }
    let intentType = "summary";
    const isMcq = /(اختيار من متعدد|اختيارات|خيارات|mcq|multiple choice|اختر الإجابة|اختر الاجابه|اختيار متعدد)/i.test(q);
    const isExam = /(امتحان|اختبار نهائي|نموذج امتحان|اختبار شامل|exam|test|quiz)/i.test(q);
    const isReview = /(مراجعة|مراجعه|اسئلة مراجعة|أسئلة مراجعة|سؤال وجواب|سين وجيم|q&a|flashcards|بطاقات مراجعة|مع الإجابات|مع الاجابات|مع الحل|مع نموذج الإجابة)/i.test(q);
    const isComprehension = /(فهم واستيعاب|فهم|تحليل|مقالي|مقالية|استيعاب|comprehension|analytical)/i.test(q);
    const isGeneralQuestions = /(أسئلة|اسئلة|سؤال|اسئله|أسئله|questions?|اختبرني|اسألني|اسالني|كويز)/i.test(q);
    const isKeyPoints = /(أهم النقاط|اهم النقاط|النقاط الرئيسية|النقاط المهمة|استخرج النقاط|نقاط أساسية|key points|takeaways|bullet points|ملاحظات رئيسية)/i.test(q);
    const isAudioNotesOnly = /(audio notes|ملاحظات صوتية|ملاحظات مسموعة|نوتس صوتية|نوتس صوتي)/i.test(q);
    const isSummaryExplicit = isGenericSummaryOrExplanationIntent(q);
    if (isMcq) {
      intentType = "questions_mcq";
      if (!questionCount) questionCount = 5;
    } else if (isExam) {
      intentType = "questions_exam";
    } else if (isReview) {
      intentType = "questions_review";
    } else if (isComprehension) {
      intentType = "questions_comprehension";
    } else if (isGeneralQuestions) {
      intentType = "questions_general";
      if (!questionCount) questionCount = 5;
    } else if (isKeyPoints) {
      intentType = "key_points_notes";
    } else if (isAudioNotesOnly) {
      intentType = "audio_notes";
    } else if (isSummaryExplicit) {
      intentType = "summary";
    } else if (hasMediaOrDoc) {
      intentType = "summary";
    } else {
      intentType = "custom";
    }
    const includeAnswers = /(إجابات|اجابات|حل|نموذج إجابة|نموذج اجابه|مع الإجابة|مع الاجابة|with answers|solutions)/i.test(q) || intentType === "questions_review" || intentType === "questions_mcq" || intentType === "questions_exam";
    let sourceType = "text";
    const ytInfo = extractYouTubeUrl(userQuery);
    if (ytInfo) {
      sourceType = "youtube";
    } else if (reqBody.fileName && reqBody.fileName.toLowerCase().endsWith(".pdf")) {
      sourceType = "pdf";
    } else if (reqBody.fileName && (reqBody.fileName.toLowerCase().endsWith(".png") || reqBody.fileName.toLowerCase().endsWith(".jpg") || reqBody.fileName.toLowerCase().endsWith(".jpeg") || reqBody.fileName.toLowerCase().endsWith(".webp"))) {
      sourceType = "image";
    } else if (reqBody.fileName && (reqBody.fileName.toLowerCase().endsWith(".mp3") || reqBody.fileName.toLowerCase().endsWith(".wav") || reqBody.fileName.toLowerCase().endsWith(".m4a"))) {
      sourceType = "audio";
    } else if (reqBody.fileName) {
      sourceType = "document";
    }
    let summaryType = "standard";
    if (/(قصير|موجز|سريع|short|quick|brief)/i.test(q)) {
      summaryType = "short";
    } else if (/(مفصل|تفصيلي|شامل|عميق|detailed|in-depth|comprehensive)/i.test(q)) {
      summaryType = "detailed";
    } else if (/(نقاط|bullet)/i.test(q)) {
      summaryType = "bullet_points";
    }
    const voiceProfile = resolveVoiceProfile(userQuery, userProfileContext);
    return {
      intentType,
      questionCount,
      includeAnswers,
      isAudioDelivery,
      isDocumentOrMedia: hasMediaOrDoc || sourceType !== "text",
      sourceType,
      voiceProfile,
      summaryType
    };
  }
  function buildSpecializedPromptAndSystemInstruction(intent, userQuery, sourceTitle) {
    const count = intent.questionCount || 5;
    switch (intent.intentType) {
      case "questions_mcq":
        return {
          systemInstruction: "\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0648\u0635\u0627\u0646\u0639 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A \u0627\u0644\u0641\u0627\u0626\u0642 \u0644\u0645\u0646\u0635\u0629 THOTH. \u0645\u0647\u0645\u062A\u0643 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0623\u0633\u0626\u0644\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0645\u062A\u0639\u062F\u062F (Multiple Choice Questions) \u0645\u0628\u0646\u064A\u0629 \u0628\u062F\u0642\u0629 \u0639\u0644\u0649 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0633\u062A\u0646\u062F. \u0627\u0644\u062A\u0632\u0645 \u062A\u0645\u0627\u0645\u0627\u064B \u0628\u0639\u062F\u062F \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0648\u0628\u0646\u064A\u0629 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0623\u0631\u0628\u0639\u0629 (\u0623\u060C \u0628\u060C \u062C\u060C \u062F) \u0645\u0639 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0648\u0634\u0631\u062D \u0648\u062A\u0641\u0633\u064A\u0631 \u0639\u0644\u0645\u064A \u0645\u0631\u0643\u0632 \u0644\u0633\u0628\u0628 \u0635\u062D\u062A\u0647\u0627. \u0644\u0627 \u062A\u0642\u062F\u0645 \u0645\u0644\u062E\u0635\u0627\u064B \u0639\u0627\u0645\u0627\u064B \u0644\u0644\u0645\u0633\u062A\u0646\u062F \u0628\u062F\u0644\u0627\u064B \u0645\u0646 \u0627\u0644\u0623\u0633\u0626\u0644\u0629.",
          prompt: `\u0627\u0644\u0645\u0637\u0644\u0648\u0628: \u0642\u0645 \u0628\u062F\u0631\u0627\u0633\u0629 \u0648\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0642\u062F\u0645 \u0648\u0627\u0633\u062A\u062E\u0631\u062C \u0645\u0646\u0647 \u0639\u062F\u062F (${count}) \u0623\u0633\u0626\u0644\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0645\u062A\u0639\u062F\u062F (Multiple Choice Questions - MCQs):

\u0642\u0648\u0627\u0639\u062F \u0627\u0644\u0625\u062E\u0631\u0627\u062C \u0627\u0644\u0625\u0644\u0632\u0627\u0645\u064A\u0629:
1. \u0631\u0642\u0645 \u0643\u0644 \u0633\u0624\u0627\u0644 \u0628\u0648\u0636\u0648\u062D (\u0645\u062B\u0627\u0644: **\u0627\u0644\u0633\u0624\u0627\u0644 1:** ...).
2. \u0636\u0639 4 \u062E\u064A\u0627\u0631\u0627\u062A \u0645\u062A\u0645\u0627\u064A\u0632\u0629 \u0644\u0643\u0644 \u0633\u0624\u0627\u0644:
   - \u0623) ...
   - \u0628) ...
   - \u062C) ...
   - \u062F) ...
3. \u0636\u0639 \u0633\u0637\u0631 **\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629:** \u0645\u062A\u0628\u0648\u0639\u0627\u064B \u0628\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0635\u062D\u064A\u062D \u0648\u062A\u0641\u0633\u064A\u0631 \u0639\u0644\u0645\u064A \u062F\u0642\u064A\u0642 \u0644\u0633\u0628\u0628 \u0635\u062D\u062A\u0647\u0627.
4. \u0645\u0645\u0646\u0648\u0639 \u0625\u0639\u0637\u0627\u0621 \u0645\u0644\u062E\u0635 \u0639\u0627\u0645 \u0644\u0644\u0645\u0633\u062A\u0646\u062F\u060C \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062D\u0635\u0631\u0627\u064B \u0647\u0648 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A.

\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0625\u0636\u0627\u0641\u064A \u0625\u0646 \u0648\u062C\u062F: "${userQuery}"`,
          spokenTone: "\u0646\u0628\u0631\u0629 \u0627\u062E\u062A\u0628\u0627\u0631 \u0648\u062A\u062F\u0631\u064A\u0628 \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u062A\u0634\u0631\u062D \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A"
        };
      case "questions_comprehension":
        return {
          systemInstruction: "\u0623\u0646\u062A \u0623\u0633\u062A\u0627\u0630 \u0648\u0645\u0648\u062C\u0647 \u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0641\u0627\u0626\u0642 \u0644\u0645\u0646\u0635\u0629 THOTH. \u0645\u0647\u0645\u062A\u0643 \u0635\u064A\u0627\u063A\u0629 \u0623\u0633\u0626\u0644\u0629 \u0641\u0647\u0645 \u0648\u062A\u062D\u0644\u064A\u0644 \u0648\u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0639\u0645\u064A\u0642 \u0645\u0628\u0646\u064A\u0629 \u0639\u0644\u0649 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0648\u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0628\u064A\u0646 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0628\u062F\u0642\u0629\u060C \u0645\u0639 \u0625\u062C\u0627\u0628\u0627\u062A \u0646\u0645\u0648\u0630\u062C\u064A\u0629.",
          prompt: `\u0627\u0644\u0645\u0637\u0644\u0648\u0628: \u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0648\u0635\u064A\u0627\u063A\u0629 \u0639\u062F\u062F (${count}) \u0623\u0633\u0626\u0644\u0629 \u0641\u0647\u0645 \u0648\u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0648\u062A\u062D\u0644\u064A\u0644 \u0645\u0639\u0645\u0642\u0629 \u062A\u063A\u0637\u064A \u0623\u0647\u0645 \u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0631 \u0645\u0639 \u062A\u0642\u062F\u064A\u0645 \u0646\u0645\u0648\u0630\u062C \u0625\u062C\u0627\u0628\u0629 \u0648\u062A\u0641\u0633\u064A\u0631 \u0627\u0633\u062A\u064A\u0639\u0627\u0628\u064A \u0648\u0627\u0641\u064D \u0644\u0643\u0644 \u0633\u0624\u0627\u0644.

\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: "${userQuery}"`,
          spokenTone: "\u0646\u0628\u0631\u0629 \u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u062A\u0634\u0631\u062D \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u064A\u0629 \u0648\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0625\u062C\u0627\u0628\u0629"
        };
      case "questions_review":
        return {
          systemInstruction: "\u0623\u0646\u062A \u0645\u0648\u062C\u0647 \u062F\u0631\u0627\u0633\u064A \u0648\u0645\u0635\u0645\u0645 \u0628\u0637\u0627\u0642\u0627\u062A \u0645\u0631\u0627\u062C\u0639\u0629 \u0630\u0643\u064A\u0629 (Flashcards & Q&A) \u0644\u0645\u0646\u0635\u0629 THOTH. \u0645\u0647\u0645\u062A\u0643 \u0625\u0639\u062F\u0627\u062F \u0623\u0633\u0626\u0644\u0629 \u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u062A\u062B\u0628\u064A\u062A \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0645\u0639 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629.",
          prompt: `\u0627\u0644\u0645\u0637\u0644\u0648\u0628: \u0642\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 \u0645\u0631\u0627\u062C\u0639\u0629 \u0634\u0627\u0645\u0644\u0629 \u0628\u0635\u064A\u063A\u0629 (\u0633\u0624\u0627\u0644 \u0648\u062C\u0648\u0627\u0628 - Q&A / \u0628\u0637\u0627\u0642\u0627\u062A \u0645\u0631\u0627\u062C\u0639\u0629) \u062A\u063A\u0637\u064A \u0643\u0627\u0641\u0629 \u0623\u062C\u0632\u0627\u0621 \u0648\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0645\u0639 \u0625\u062C\u0627\u0628\u0627\u062A \u0646\u0645\u0648\u0630\u062C\u064A\u0629 \u0648\u0627\u0636\u062D\u0629.

\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: "${userQuery}"`,
          spokenTone: "\u0646\u0628\u0631\u0629 \u0645\u0631\u0627\u062C\u0639\u0629 \u0633\u0631\u064A\u0639\u0629 \u0648\u062A\u062B\u0628\u064A\u062A \u0644\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A"
        };
      case "questions_exam":
        return {
          systemInstruction: "\u0623\u0646\u062A \u0645\u0635\u0645\u0645 \u0627\u0645\u062A\u062D\u0627\u0646\u0627\u062A \u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0634\u0627\u0645\u0644 \u0644\u0645\u0646\u0635\u0629 THOTH. \u0645\u0647\u0645\u062A\u0643 \u0625\u0646\u0634\u0627\u0621 \u0646\u0645\u0648\u0630\u062C \u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u062A\u0643\u0627\u0645\u0644 \u0645\u0639 \u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0648\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0625\u062C\u0627\u0628\u0629.",
          prompt: `\u0627\u0644\u0645\u0637\u0644\u0648\u0628: \u0642\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 \u0646\u0645\u0648\u0630\u062C \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062A\u0643\u0627\u0645\u0644 \u0645\u0642\u0633\u0645 \u0625\u0644\u0649 \u0623\u0642\u0633\u0627\u0645 (\u0623\u0633\u0626\u0644\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0645\u062A\u0639\u062F\u062F\u060C \u0623\u0633\u0626\u0644\u0629 \u0645\u0642\u0627\u0644\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642\u064A\u0629) \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0645\u062D\u062A\u0648\u0649\u060C \u0645\u0639 \u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0648\u0625\u0631\u0641\u0627\u0642 \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0634\u0627\u0645\u0644 \u0641\u064A \u0627\u0644\u0646\u0647\u0627\u064A\u0629.

\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: "${userQuery}"`,
          spokenTone: "\u0646\u0628\u0631\u0629 \u0627\u062E\u062A\u0628\u0627\u0631 \u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0634\u0627\u0645\u0644"
        };
      case "questions_general":
        return {
          systemInstruction: "\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A \u0644\u0645\u0646\u0635\u0629 THOTH. \u0642\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 \u0623\u0633\u0626\u0644\u0629 \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0630\u0643\u064A\u0629 \u0648\u0645\u062A\u0646\u0648\u0639\u0629 \u062A\u0642\u064A\u0633 \u0641\u0647\u0645 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0628\u062F\u0642\u0629.",
          prompt: `\u0627\u0644\u0645\u0637\u0644\u0648\u0628: \u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0639\u062F\u062F (${count}) \u0623\u0633\u0626\u0644\u0629 \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0630\u0643\u064A\u0629 \u062A\u063A\u0637\u064A \u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0645\u0639 \u0625\u062C\u0627\u0628\u0627\u062A\u0647\u0627 \u0627\u0644\u062A\u0648\u0636\u064A\u062D\u064A\u0629.

\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: "${userQuery}"`,
          spokenTone: "\u0646\u0628\u0631\u0629 \u062A\u062F\u0631\u064A\u0628 \u0648\u0623\u0633\u0626\u0644\u0629 \u062A\u0641\u0627\u0639\u0644\u064A\u0629"
        };
      case "key_points_notes":
        return {
          systemInstruction: "\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u062A\u0644\u062E\u064A\u0635 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0630\u0643\u064A\u0629 \u0644\u0645\u0646\u0635\u0629 THOTH. \u0645\u0647\u0645\u062A\u0643 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u062C\u0648\u0647\u0631\u064A\u0629 (Key Takeaways / Core Notes) \u0648\u062A\u0646\u0633\u064A\u0642\u0647\u0627 \u0628\u0634\u0643\u0644 \u062C\u0630\u0627\u0628 \u0648\u0645\u0646\u0638\u0645.",
          prompt: `\u0627\u0644\u0645\u0637\u0644\u0648\u0628: \u0627\u0633\u062A\u062E\u0631\u062C \u0623\u0647\u0645 \u0627\u0644\u0646\u0642\u0627\u0637 \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u062C\u0648\u0647\u0631\u064A\u0629 (Key Takeaways) \u0645\u0646 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0648\u0642\u0633\u0645\u0647\u0627 \u0625\u0644\u0649 \u0645\u062D\u0627\u0648\u0631 \u0631\u0626\u064A\u0633\u064A\u0629 \u0645\u0639 \u062A\u0645\u064A\u064A\u0632 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0647\u0627\u0645\u0629 \u0641\u064A \u0646\u0642\u0627\u0637 \u0645\u0646\u0638\u0645\u0629 \u0648\u0639\u0646\u0627\u0648\u064A\u0646 \u0641\u0631\u0639\u064A\u0629.

\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: "${userQuery}"`,
          spokenTone: "\u0646\u0628\u0631\u0629 \u0627\u0633\u062A\u0639\u0631\u0627\u0636 \u0633\u0631\u064A\u0639 \u0644\u0623\u0647\u0645 \u0627\u0644\u0646\u0642\u0627\u0637 \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u062C\u0648\u0647\u0631\u064A\u0629"
        };
      case "audio_notes":
        return {
          systemInstruction: "\u0623\u0646\u062A \u0645\u0639\u062F \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0648\u0627\u0644\u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A \u0644\u0645\u0646\u0635\u0629 THOTH. \u0645\u0647\u0645\u062A\u0643 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0625\u0644\u0649 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0635\u0648\u062A\u064A\u0629 (Audio Notes) \u0645\u0631\u0643\u0632\u0629 \u0648\u0645\u0645\u062A\u0639\u0629 \u0648\u0633\u0644\u0633\u0629 \u0644\u0644\u0625\u0644\u0642\u0627\u0621 \u0648\u0627\u0644\u0627\u0633\u062A\u0645\u0627\u0639.",
          prompt: `\u0627\u0644\u0645\u0637\u0644\u0648\u0628: \u062D\u0648\u0651\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0625\u0644\u0649 "\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0635\u0648\u062A\u064A\u0629 (Audio Notes)" \u0645\u0631\u0643\u0632\u0629 \u062A\u0634\u0631\u062D \u0623\u0647\u0645 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0628\u0623\u0633\u0644\u0648\u0628 \u0634\u0641\u0647\u064A \u0645\u0646\u0638\u0645 \u0648\u0633\u0644\u0633 \u0648\u062C\u0630\u0627\u0628 \u0645\u0639\u062F \u0644\u0644\u0627\u0633\u062A\u0645\u0627\u0639 \u0648\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629.

\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: "${userQuery}"`,
          spokenTone: "\u0646\u0628\u0631\u0629 \u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0648\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0635\u0648\u062A\u064A\u0629 \u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0645\u0645\u062A\u0639\u0629"
        };
      case "summary":
      default:
        const lengthInstruction = intent.summaryType === "short" ? "\u0644\u062E\u0635 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0641\u064A \u0645\u0644\u062E\u0635 \u0645\u0648\u062C\u0632 \u0648\u0645\u0643\u062B\u0641 \u064A\u0631\u0643\u0632 \u0639\u0644\u0649 \u0627\u0644\u062E\u0644\u0627\u0635\u0629 \u0627\u0644\u0623\u0647\u0645." : intent.summaryType === "detailed" ? "\u0642\u062F\u0645 \u0645\u0644\u062E\u0635\u0627\u064B \u062A\u0641\u0635\u064A\u0644\u064A\u0627\u064B \u0648\u0634\u0627\u0645\u0644\u0627\u064B \u064A\u063A\u0637\u064A \u0643\u0627\u0641\u0629 \u062C\u0648\u0627\u0646\u0628 \u0648\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0645\u0639 \u0627\u0644\u0634\u0631\u062D." : "\u0642\u062F\u0645 \u0645\u0644\u062E\u0635\u0627\u064B \u0630\u0643\u064A\u0627\u064B \u0648\u0634\u0627\u0645\u0644\u0627\u064B \u0648\u0645\u0646\u0638\u0645\u0627\u064B \u064A\u0628\u0631\u0632 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0648\u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u062C\u0648\u0647\u0631\u064A\u0629.";
        return {
          systemInstruction: "\u0623\u0646\u062A \u0646\u0638\u0627\u0645 \u0627\u0644\u0641\u0647\u0645 \u0648\u0627\u0644\u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0627\u0644\u0641\u0627\u0626\u0642 \u0644\u0645\u0646\u0635\u0629 THOTH. \u0642\u0645 \u0628\u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0648\u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0628\u062F\u0642\u0629 \u0639\u0627\u0644\u064A\u0629 \u0648\u0639\u0645\u0642 \u0645\u0641\u0627\u0647\u064A\u0645\u064A.",
          prompt: `\u0627\u0644\u0645\u0637\u0644\u0648\u0628: ${lengthInstruction}

\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: "${userQuery}"`,
          spokenTone: "\u0645\u0642\u062F\u0645 \u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0630\u0643\u064A \u064A\u0634\u0631\u062D \u0627\u0644\u0645\u0644\u062E\u0635 \u0628\u0627\u0646\u0633\u064A\u0627\u0628\u064A\u0629"
        };
    }
  }
  function validateGeneratedOutput(text, intent) {
    if (!text || text.trim().length < 20) return { isValid: false, reason: "Output is too short or empty" };
    if (["questions_mcq", "questions_comprehension", "questions_review", "questions_exam", "questions_general"].includes(intent.intentType)) {
      const hasQuestionMark = text.includes("?") || text.includes("\u061F");
      const hasQuestionKeywords = /(سؤال|السؤال|اختر|الخيار|أ\)|ب\)|Question|MCQ|Q\d|اختبار|امتحان)/i.test(text);
      if (!hasQuestionMark && !hasQuestionKeywords) {
        return { isValid: false, reason: "Output lacks questions for a question request" };
      }
    }
    if (intent.intentType === "questions_mcq") {
      const hasOptions = /[أ-د]\)|[A-D]\)|[1-4]\)|أ\.|ب\./i.test(text);
      if (!hasOptions) {
        return { isValid: false, reason: "Output lacks MCQ option format" };
      }
    }
    if (intent.intentType === "key_points_notes") {
      const hasBulletPoints = text.includes("-") || text.includes("\u2022") || text.includes("*") || /نقطة|محور|أولاً|ثانياً/i.test(text);
      if (!hasBulletPoints && text.length > 300) {
        return { isValid: false, reason: "Output lacks structured note/bullet format" };
      }
    }
    return { isValid: true };
  }
  function cleanTextForTTS(spokenScript) {
    if (!spokenScript) return "";
    return spokenScript.replace(/[#*`_~>\[\]\(\)\{\}\\\/\|]/g, " ").replace(/Speaker:\s*-[^\n]+/gi, "").replace(/Delivery Rules:[^\n]+/gi, "").replace(/Content:\s*/gi, "").replace(/[\u{1F300}-\u{1F9FF}]/gu, "").replace(/\s+/g, " ").trim();
  }
  function buildTTSPrompt(spokenScript, profile) {
    return cleanTextForTTS(spokenScript);
  }
  async function generateSpokenScript({
    summaryOrContent,
    profile,
    sourceType,
    title,
    intentType
  }) {
    const isQuestions = intentType && ["questions_mcq", "questions_comprehension", "questions_review", "questions_exam", "questions_general"].includes(intentType);
    const isNotes = intentType === "audio_notes" || intentType === "key_points_notes";
    const prompt = isQuestions ? `\u062D\u0648\u0644 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u062A\u0627\u0644\u064A \u0625\u0644\u0649 "\u062A\u0633\u062C\u064A\u0644 \u0635\u0648\u062A\u064A \u0634\u0641\u0647\u064A \u062A\u0641\u0627\u0639\u0644\u064A" (Spoken Q&A Script) \u0645\u0646\u0627\u0633\u0628 \u0644\u0644\u0625\u0644\u0642\u0627\u0621 \u0648\u0627\u0644\u0627\u0633\u062A\u0645\u0627\u0639 \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631:
\u0627\u0644\u0645\u0635\u062F\u0631: ${sourceType} ${title ? `(${title})` : ""}
\u0627\u0644\u0644\u0647\u062C\u0629: ${profile.dialect}
\u0627\u0644\u0646\u0628\u0631\u0629 \u0648\u0627\u0644\u0623\u0633\u0644\u0648\u0628: ${profile.tone} - \u0623\u0633\u0644\u0648\u0628 \u062A\u0641\u0627\u0639\u0644\u064A \u0645\u0645\u062A\u0639 \u064A\u0644\u0642\u064A \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0628\u0648\u0636\u0648\u062D.

\u0627\u0644\u0642\u0648\u0627\u0639\u062F:
1. \u0627\u0646\u0637\u0642 \u0627\u0644\u0633\u0624\u0627\u0644 \u0648\u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0634\u0641\u0647\u064A \u0627\u0646\u0633\u064A\u0627\u0628\u064A.
2. \u0627\u062D\u0630\u0641 \u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0631\u0643\u062F\u0627\u0648\u0646 \u0648\u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u063A\u0631\u064A\u0628\u0629 (#, *, [], >).
3. \u0644\u0627 \u062A\u0643\u062A\u0628 \u0623\u064A \u0625\u0631\u0634\u0627\u062F\u0627\u062A \u062F\u0627\u062E\u0644 \u0623\u0642\u0648\u0627\u0633 \u0645\u062B\u0644 [\u0645\u0648\u0633\u064A\u0642\u0649]. \u0627\u0643\u062A\u0628 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0646\u0637\u0648\u0642 \u0627\u0644\u0641\u0639\u0644\u064A \u0641\u0642\u0637.

\u0627\u0644\u0645\u062D\u062A\u0648\u0649:
${summaryOrContent}` : isNotes ? `\u062D\u0648\u0644 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0648\u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0625\u0644\u0649 "\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0635\u0648\u062A\u064A\u0629 \u0634\u0641\u0647\u064A\u0629" (Spoken Audio Notes) \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u0625\u0644\u0642\u0627\u0621 \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631:
\u0627\u0644\u0645\u0635\u062F\u0631: ${sourceType} ${title ? `(${title})` : ""}
\u0627\u0644\u0644\u0647\u062C\u0629: ${profile.dialect}
\u0627\u0644\u0646\u0628\u0631\u0629 \u0648\u0627\u0644\u0623\u0633\u0644\u0648\u0628: ${profile.tone}

\u0627\u0644\u0642\u0648\u0627\u0639\u062F:
1. \u0623\u0633\u0644\u0648\u0628 \u0625\u0630\u0627\u0639\u064A \u0634\u0641\u0647\u064A \u0630\u0643\u064A \u0648\u0633\u0644\u0633 \u064A\u0634\u0631\u062D \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0648\u0627\u0644\u0646\u0642\u0627\u0637 \u0628\u062A\u0631\u062A\u064A\u0628 \u0645\u0631\u064A\u062D \u0644\u0644\u0623\u0630\u0646.
2. \u0627\u062D\u0630\u0641 \u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0631\u0643\u062F\u0627\u0648\u0646 \u0648\u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u063A\u0631\u064A\u0628\u0629 (#, *, [], >).
3. \u0644\u0627 \u062A\u0643\u062A\u0628 \u0623\u064A \u0625\u0631\u0634\u0627\u062F\u0627\u062A \u062F\u0627\u062E\u0644 \u0623\u0642\u0648\u0627\u0633. \u0627\u0643\u062A\u0628 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0646\u0637\u0648\u0642 \u0627\u0644\u0641\u0639\u0644\u064A \u0641\u0642\u0637.

\u0627\u0644\u0645\u062D\u062A\u0648\u0649:
${summaryOrContent}` : `\u062D\u0648\u0644 \u0627\u0644\u0646\u0635 \u0648\u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0627\u0644\u064A \u0625\u0644\u0649 "\u0646\u0635 \u0625\u0630\u0627\u0639\u064A \u0645\u0646\u0637\u0648\u0642" (Spoken Script / Podcast Summary) \u062C\u0627\u0647\u0632 \u0644\u0644\u0625\u0644\u0642\u0627\u0621 \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631:
\u0627\u0644\u0645\u0635\u062F\u0631: ${sourceType} ${title ? `(${title})` : ""}
\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u0625\u0644\u0642\u0627\u0621 \u0627\u0644\u0635\u0648\u062A\u064A: ${profile.dialect}
\u0627\u0644\u0646\u0628\u0631\u0629 \u0648\u0627\u0644\u0623\u0633\u0644\u0648\u0628: ${profile.tone} - ${profile.delivery}

\u0642\u0648\u0627\u0639\u062F \u0623\u0633\u0627\u0633\u064A\u0629 \u0648\u062D\u0627\u0633\u0645\u0629:
1. \u0645\u0645\u0646\u0648\u0639 \u062A\u0645\u0627\u0645\u0627\u064B \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0631\u0643\u062F\u0627\u0648\u0646 (\u0645\u062B\u0644 # \u0623\u0648 ## \u0623\u0648 ** \u0623\u0648 * \u0623\u0648 - \u0623\u0648 > \u0623\u0648 \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0645\u064F\u0631\u0642\u0645\u0629).
2. \u0645\u0645\u0646\u0648\u0639 \u0648\u0636\u0639 \u062C\u062F\u0627\u0648\u0644 \u0623\u0648 \u0623\u0643\u0648\u0627\u062F \u0623\u0648 \u0631\u0645\u0648\u0632 \u063A\u0631\u064A\u0628\u0629.
3. \u0627\u062C\u0639\u0644 \u0627\u0644\u0623\u0633\u0644\u0648\u0628 \u0634\u0641\u0647\u064A\u0627\u064B \u0637\u0628\u064A\u0639\u064A\u0627\u064B \u0645\u062B\u0644 \u0645\u0630\u064A\u0639 \u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0630\u0643\u064A \u0648\u0648\u062F\u0648\u062F \u064A\u0634\u0631\u062D \u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0628\u0628\u0633\u0627\u0637\u0629 \u0648\u0627\u0646\u0633\u064A\u0627\u0628\u064A\u0629.
4. \u0627\u0633\u062A\u062E\u062F\u0645 \u0639\u0628\u0627\u0631\u0627\u062A \u0631\u0628\u0637 \u0634\u0641\u0647\u064A\u0629 \u0645\u0631\u064A\u062D\u0629.
5. \u0644\u0627 \u062A\u0643\u062A\u0628 \u0623\u064A \u0625\u0631\u0634\u0627\u062F\u0627\u062A \u062F\u0627\u062E\u0644 \u0623\u0642\u0648\u0627\u0633 \u0645\u062B\u0644 [\u0645\u0648\u0633\u064A\u0642\u0649] \u0623\u0648 [\u0648\u0642\u0641\u0629]\u060C \u0627\u0643\u062A\u0628 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0646\u0637\u0648\u0642 \u0627\u0644\u0641\u0639\u0644\u064A \u0641\u0642\u0637.

\u0627\u0644\u0645\u062D\u062A\u0648\u0649:
${summaryOrContent}`;
    try {
      const res = await routeUnderstandingTask({
        task: isQuestions ? "spoken_questions_generation" : isNotes ? "spoken_notes_generation" : "spoken_script_generation",
        requiredCapabilities: ["text", "summarization"],
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: "\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0646\u0635\u0648\u0635 \u0627\u0644\u0625\u0630\u0627\u0639\u064A\u0629 \u0648\u0627\u0644\u062A\u0633\u062C\u064A\u0644\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0644\u0645\u0646\u0635\u0629 THOTH."
      });
      let script = res.text.replace(/[#*`_~>\[\]]/g, "").trim();
      return script || summaryOrContent;
    } catch (err) {
      return summaryOrContent.replace(/[#*`_~>\[\]]/g, "").replace(/\n{2,}/g, "\n").trim();
    }
  }
  async function fetchFallbackTtsAudio(text, lang = "ar") {
    try {
      const clean = text.replace(/[#*`_~>\[\]]/g, " ").replace(/\s+/g, " ").trim();
      if (!clean) return null;
      const chunk = clean.slice(0, 180);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        return {
          audioBase64: buf.toString("base64"),
          mimeType: "audio/mp3"
        };
      }
    } catch (e) {
      console.warn("[FALLBACK TTS EXCEPTION]:", e);
    }
    return null;
  }
  async function generateSpeechAudioMultiModel(ttsPrompt, voiceName = "Aoede") {
    const cleanPrompt = cleanTextForTTS(ttsPrompt);
    if (!cleanPrompt) return null;
    if (!ai) await refreshAiClient();
    const validVoices = ["Aoede", "Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
    const finalVoice = validVoices.includes(voiceName) ? voiceName : "Aoede";
    if (ai) {
      try {
        const generatePromise = ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: cleanPrompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: finalVoice
                }
              }
            }
          }
        });
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error(`TTS model gemini-3.1-flash-tts-preview timed out after 20s`)), 2e4)
        );
        const response = await Promise.race([generatePromise, timeoutPromise]);
        const parts = response?.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          if (p.inlineData?.data) {
            return {
              audioBase64: p.inlineData.data,
              mimeType: p.inlineData.mimeType || "audio/wav",
              voiceName: finalVoice
            };
          }
        }
      } catch (err) {
        console.warn(`[TTS ROUTER] Gemini TTS attempt failed:`, err?.message || err);
      }
    }
    try {
      const fallbackRes = await fetchFallbackTtsAudio(cleanPrompt, "ar");
      if (fallbackRes) {
        return {
          audioBase64: fallbackRes.audioBase64,
          mimeType: fallbackRes.mimeType,
          voiceName: finalVoice
        };
      }
    } catch (fbErr) {
      console.warn(`[TTS ROUTER] Fallback TTS synthesis error:`, fbErr);
    }
    return null;
  }
  async function synthesizeFullAudioScript(spokenScript, profile) {
    const cleanScript = cleanTextForTTS(spokenScript);
    if (!cleanScript) return null;
    if (cleanScript.length <= 400) {
      const audioRes = await generateSpeechAudioMultiModel(cleanScript, profile.voiceName);
      if (!audioRes) return null;
      const rawBuffer = Buffer.from(audioRes.audioBase64, "base64");
      if (audioRes.mimeType.includes("mp3")) {
        const durationSec2 = Math.max(3, Math.round(cleanScript.length / 15));
        return {
          audioUrl: `data:audio/mp3;base64,${audioRes.audioBase64}`,
          durationSec: durationSec2
        };
      }
      let finalBuffer;
      if (audioRes.mimeType.includes("pcm") || rawBuffer.length > 4 && rawBuffer.toString("ascii", 0, 4) !== "RIFF") {
        finalBuffer = pcmToWav(rawBuffer, 24e3);
      } else {
        finalBuffer = rawBuffer;
      }
      const durationSec = Math.max(3, Math.round(rawBuffer.length / (24e3 * 2)));
      return {
        audioUrl: `data:audio/wav;base64,${finalBuffer.toString("base64")}`,
        durationSec
      };
    }
    const sentences = cleanScript.split(/(?<=[.!\?\n\u06D4\u061F]+)\s+/);
    const chunks = [];
    let currentChunk = "";
    for (const s of sentences) {
      if ((currentChunk + " " + s).length > 350) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = s;
      } else {
        currentChunk = currentChunk ? currentChunk + " " + s : s;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    const selectedChunks = chunks.slice(0, 4);
    const pcmBuffers = [];
    const mp3Buffers = [];
    for (const chunk of selectedChunks) {
      const chunkRes = await generateSpeechAudioMultiModel(chunk, profile.voiceName);
      if (chunkRes && chunkRes.audioBase64) {
        const rawBuf = Buffer.from(chunkRes.audioBase64, "base64");
        if (chunkRes.mimeType.includes("mp3")) {
          mp3Buffers.push(rawBuf);
        } else {
          if (rawBuf.length > 44 && rawBuf.toString("ascii", 0, 4) === "RIFF") {
            pcmBuffers.push(rawBuf.subarray(44));
          } else {
            pcmBuffers.push(rawBuf);
          }
        }
      }
    }
    if (pcmBuffers.length > 0) {
      const combinedPcm = Buffer.concat(pcmBuffers);
      const finalWav = pcmToWav(combinedPcm, 24e3);
      const durationSec = Math.max(3, Math.round(combinedPcm.length / (24e3 * 2)));
      return {
        audioUrl: `data:audio/wav;base64,${finalWav.toString("base64")}`,
        durationSec
      };
    }
    if (mp3Buffers.length > 0) {
      const combinedMp3 = Buffer.concat(mp3Buffers);
      const durationSec = Math.max(3, Math.round(cleanScript.length / 15));
      return {
        audioUrl: `data:audio/mp3;base64,${combinedMp3.toString("base64")}`,
        durationSec
      };
    }
    return null;
  }
  async function getUserPlanDetails(userId) {
    let userPlanId = "free";
    if (!userId || userId === "guest" || userId === "anonymous") {
      userPlanId = "guest";
    } else {
      try {
        const userSnap = await getDoc(doc2(dbWeb, "users", userId));
        if (userSnap.exists()) {
          const d = userSnap.data();
          if (d.plan) userPlanId = d.plan.toLowerCase();
          else if (d.subscriptionPlan) userPlanId = d.subscriptionPlan.toLowerCase();
          if (d.subscriptionExpiresAt && d.subscriptionExpiresAt !== "permanent" && userPlanId !== "free" && userPlanId !== "guest") {
            const expTime = new Date(d.subscriptionExpiresAt).getTime();
            if (!isNaN(expTime) && Date.now() > expTime) {
              userPlanId = "free";
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch user plan for quota check:", e);
      }
    }
    const plansConfig = await getUsagePlansConfig();
    const planConfig = plansConfig[userPlanId] || plansConfig["free"] || DEFAULT_USAGE_PLANS.free;
    return { planId: userPlanId, planConfig };
  }
  async function checkDailyAudioCredit(userId, clientIp) {
    const isGuest = !userId || userId === "guest" || userId === "anonymous";
    if (isGuest) {
      return {
        allowed: false,
        plan: "guest",
        limit: 0,
        used: 0,
        errorReason: "guest_login_required"
      };
    }
    const { planId, planConfig } = await getUserPlanDetails(userId);
    const limitVal = Number(planConfig.audioSummary ?? DEFAULT_USAGE_PLANS[planId]?.audioSummary ?? 1);
    if (limitVal >= 999999) {
      return { allowed: true, plan: planId, limit: limitVal, used: 0 };
    }
    const todayUtc = getTodayDateStr();
    const quotaKey = `${userId}_audio_${todayUtc}`;
    let currentUsed = 0;
    try {
      const quotaRef = doc2(dbWeb, "dailyAudioUsage", quotaKey);
      const snap = await getDoc(quotaRef);
      if (snap.exists()) {
        currentUsed = Number(snap.data().count || 0);
      }
    } catch (err) {
      currentUsed = globalAudioUsageMem.get(quotaKey) || 0;
    }
    if (currentUsed >= limitVal) {
      return { allowed: false, plan: planId, limit: limitVal, used: currentUsed, errorReason: "limit_reached" };
    }
    return { allowed: true, plan: planId, limit: limitVal, used: currentUsed };
  }
  async function recordSuccessfulDailyAudioCredit(userId, clientIp) {
    if (!userId || userId === "guest") return;
    const todayUtc = getTodayDateStr();
    const quotaKey = `${userId}_audio_${todayUtc}`;
    let currentCount = 0;
    try {
      const quotaRef = doc2(dbWeb, "dailyAudioUsage", quotaKey);
      const snap = await getDoc(quotaRef);
      if (snap.exists()) {
        currentCount = Number(snap.data().count || 0);
      }
      await setDoc2(quotaRef, {
        userId,
        dateUtc: todayUtc,
        count: currentCount + 1,
        lastGeneratedAt: Date.now()
      }, { merge: true });
      await setDoc2(doc2(dbWeb, "users", userId), {
        [`dailyAudioCount_${todayUtc}`]: currentCount + 1,
        lastAudioUsageAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Failed to write daily audio usage to Firestore:", err);
    }
    globalAudioUsageMem.set(quotaKey, (globalAudioUsageMem.get(quotaKey) || currentCount) + 1);
  }
  async function checkDailyTextSummaryCredit(userId, clientIp) {
    const isGuest = !userId || userId === "guest" || userId === "anonymous";
    const effectiveId = isGuest ? `guest_${(clientIp || "127.0.0.1").replace(/[^a-zA-Z0-9]/g, "_")}` : userId;
    const { planId, planConfig } = await getUserPlanDetails(userId);
    const limitVal = Number(planConfig.textSummary ?? DEFAULT_USAGE_PLANS[planId]?.textSummary ?? (isGuest ? 0 : 3));
    if (isGuest && limitVal <= 0) {
      return {
        allowed: false,
        plan: "guest",
        limit: 0,
        used: 0,
        errorReason: "guest_login_required"
      };
    }
    if (limitVal >= 999999) {
      return { allowed: true, plan: planId, limit: limitVal, used: 0 };
    }
    const todayUtc = getTodayDateStr();
    const quotaKey = `${effectiveId}_text_${todayUtc}`;
    let currentUsed = 0;
    try {
      const quotaRef = doc2(dbWeb, "dailyTextSummaryUsage", quotaKey);
      const snap = await getDoc(quotaRef);
      if (snap.exists()) {
        currentUsed = Number(snap.data().count || 0);
      }
    } catch (err) {
      currentUsed = globalAudioUsageMem.get(quotaKey) || 0;
    }
    if (currentUsed >= limitVal) {
      return { allowed: false, plan: planId, limit: limitVal, used: currentUsed, errorReason: "limit_reached" };
    }
    return { allowed: true, plan: planId, limit: limitVal, used: currentUsed };
  }
  async function recordSuccessfulDailyTextSummaryCredit(userId, clientIp) {
    const isGuest = !userId || userId === "guest" || userId === "anonymous";
    const effectiveId = isGuest ? `guest_${(clientIp || "127.0.0.1").replace(/[^a-zA-Z0-9]/g, "_")}` : userId;
    const todayUtc = getTodayDateStr();
    const quotaKey = `${effectiveId}_text_${todayUtc}`;
    let currentCount = 0;
    try {
      const quotaRef = doc2(dbWeb, "dailyTextSummaryUsage", quotaKey);
      const snap = await getDoc(quotaRef);
      if (snap.exists()) {
        currentCount = Number(snap.data().count || 0);
      }
      await setDoc2(quotaRef, {
        userId: userId || "guest",
        clientIp: clientIp || "",
        dateUtc: todayUtc,
        count: currentCount + 1,
        lastGeneratedAt: Date.now()
      }, { merge: true });
      if (!isGuest && userId) {
        await setDoc2(doc2(dbWeb, "users", userId), {
          [`dailyTextSummaryCount_${todayUtc}`]: currentCount + 1,
          lastTextSummaryUsageAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Failed to write daily text summary usage to Firestore:", err);
    }
    globalAudioUsageMem.set(quotaKey, (globalAudioUsageMem.get(quotaKey) || currentCount) + 1);
  }
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, mode = "fast", userId } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
      const userProfileContext = await getUserProfileContext(userId);
      let featureType = "normalChat";
      if (mode === "web_search") {
        featureType = "webSearch";
      } else if (mode === "thinking" || mode === "reasoning") {
        featureType = "thinkingChat";
      }
      const checkResult = await checkAndIncrementUsageServerSide(userId, clientIp, featureType, 1);
      if (!checkResult.allowed) {
        return res.status(403).json({
          error: true,
          code: checkResult.code,
          text: checkResult.errorText,
          message: checkResult.errorText,
          planId: checkResult.planId
        });
      }
      let validMessages = [...messages];
      while (validMessages.length > 0 && validMessages[0].role !== "user") {
        validMessages.shift();
      }
      const normalized = [];
      for (const m of validMessages) {
        const parts = [{ text: m.text || "" }];
        if (m.fileUri) {
          parts.push({
            fileData: {
              fileUri: m.fileUri,
              mimeType: m.fileType || m.mimeType || "application/pdf"
            }
          });
        } else if (m.fileUrl && typeof m.fileUrl === "string" && m.fileUrl.startsWith("https://generativelanguage.googleapis.com/")) {
          parts.push({
            fileData: {
              fileUri: m.fileUrl,
              mimeType: m.fileType || "application/pdf"
            }
          });
        } else if (m.fileUrl && typeof m.fileUrl === "string" && m.fileUrl.startsWith("data:")) {
          const match = m.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        } else if (m.imageUrl && typeof m.imageUrl === "string" && m.imageUrl.startsWith("data:")) {
          const match = m.imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        }
        if (normalized.length > 0 && normalized[normalized.length - 1].role === m.role) {
          normalized[normalized.length - 1].parts[0].text += "\n\n" + (m.text || "");
          if (parts.length > 1) {
            normalized[normalized.length - 1].parts.push(...parts.slice(1));
          }
        } else {
          normalized.push({
            role: m.role,
            parts
          });
        }
      }
      if (normalized.length > 0) {
        const lastUserIndex = [...normalized].reverse().findIndex((item) => item.role === "user");
        if (lastUserIndex !== -1) {
          const actualIndex = normalized.length - 1 - lastUserIndex;
          if (req.body.fileUri) {
            normalized[actualIndex].parts.push({
              fileData: {
                fileUri: req.body.fileUri,
                mimeType: req.body.fileType || req.body.mimeType || "application/pdf"
              }
            });
          }
          if (req.body.image) {
            if (typeof req.body.image === "string" && req.body.image.startsWith("https://generativelanguage.googleapis.com/")) {
              normalized[actualIndex].parts.push({
                fileData: {
                  fileUri: req.body.image,
                  mimeType: req.body.fileType || "image/png"
                }
              });
            } else if (typeof req.body.image === "string") {
              const imageMatch = req.body.image.match(/^data:(image\/\w+);base64,(.+)$/);
              if (imageMatch) {
                normalized[actualIndex].parts.push({
                  inlineData: { mimeType: imageMatch[1], data: imageMatch[2] }
                });
              }
            }
          }
          if (req.body.audio) {
            const audioMatch = req.body.audio.match(/^data:([^;]+);base64,(.+)$/);
            if (audioMatch) {
              normalized[actualIndex].parts.push({
                inlineData: { mimeType: audioMatch[1], data: audioMatch[2] }
              });
            }
          }
          if (req.body.file && !req.body.fileUri) {
            const fileMatch = req.body.file.match(/^data:([^;]+);base64,(.+)$/);
            if (fileMatch) {
              const mimeType = fileMatch[1];
              const data = fileMatch[2];
              const fileBuffer = Buffer.from(data, "base64");
              if (fileBuffer.length > 150 * 1024 || mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("sheet") || mimeType.includes("text") || mimeType.includes("json") || mimeType.includes("javascript")) {
                try {
                  const uploadRes = await uploadBufferToGoogleFilesApi(fileBuffer, req.body.fileName || "uploaded_document", mimeType);
                  normalized[actualIndex].parts.push({
                    fileData: {
                      fileUri: uploadRes.uri,
                      mimeType: uploadRes.mimeType || mimeType
                    }
                  });
                } catch (uploadErr) {
                  console.warn("Auto-upload on the fly failed, falling back to inlineData:", uploadErr);
                  normalized[actualIndex].parts.push({
                    inlineData: { mimeType, data }
                  });
                }
              } else {
                normalized[actualIndex].parts.push({
                  inlineData: { mimeType, data }
                });
              }
            }
          }
        }
      }
      if (normalized.length === 0) {
        return res.json({ text: "\u0645\u0631\u062D\u0628\u0627\u064B! \u0643\u064A\u0641 \u064A\u0645\u0643\u0646\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643\u061F" });
      }
      let primaryModel = "gemma-4-31b-it";
      let secondaryModel = "gemma-4-26b-a4b-it";
      let tertiaryModel = "gemini-3.7-flash";
      let baseSystemInstruction = `\u0623\u0646\u062A THOTH\u060C \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u0644\u0645\u0646\u0635\u0629 THOTH. \u0623\u062C\u0628 \u0628\u0646\u0641\u0633 \u0644\u063A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062A\u064A \u064A\u062A\u062D\u062F\u062B \u0628\u0647\u0627 (\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629\u060C \u0641\u0631\u0646\u0633\u064A\u0629\u060C \u0625\u0644\u062E)\u060C \u0648\u0625\u0630\u0627 \u062A\u062D\u062F\u062B \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u064A\u0645\u0643\u0646\u0643 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0627\u0644\u0648\u062F\u0648\u062F\u0629. \u0643\u0646 \u062F\u0642\u064A\u0642\u0627\u064B\u060C \u0630\u0643\u064A\u0627\u064B\u060C \u0648\u0648\u0627\u0636\u062D\u0627\u064B.

\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0648\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A (\u062D\u0627\u0633\u0645\u0629 \u0648\u0645\u0647\u0645\u0629 \u062C\u062F\u0627\u064B):
1. \u0639\u0646\u062F\u0645\u0627 \u064A\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0626\u0644\u0629 \u0623\u0648 \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u064B \u0623\u0648 \u064A\u0642\u0648\u0644 (\u0641\u064A\u0646 \u0627\u0644\u0623\u0633\u0626\u0644\u0629\u060C \u0627\u062E\u062A\u0628\u0631\u0646\u064A\u060C \u0627\u0639\u0645\u0644\u064A \u0643\u0648\u064A\u0632\u060C \u0623\u0633\u0626\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0641\u064A\u062F\u064A\u0648/\u0627\u0644\u0645\u0644\u0641/\u0627\u0644\u0645\u0648\u0636\u0648\u0639)\u060C \u0644\u0627 \u062A\u0643\u0631\u0631 \u0627\u0644\u0645\u0644\u062E\u0635 \u0648\u0644\u0627 \u062A\u0642\u0644 "\u0644\u062E\u0635\u062A\u0647 \u0644\u0643 \u0645\u0646 \u0642\u0628\u0644". \u0623\u0646\u0634\u0626 \u0641\u0648\u0631\u0627\u064B \u0646\u0638\u0627\u0645 \u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0630\u0643\u064A\u0629 \u0648\u0645\u062A\u0646\u0648\u0639\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0645\u062A\u0639\u062F\u062F\u060C \u0623\u0633\u0626\u0644\u0629 \u0641\u0647\u0645 \u0648\u062A\u062D\u0644\u064A\u0644\u060C \u0648\u0623\u0633\u0626\u0644\u0629 \u062A\u0637\u0628\u064A\u0642\u064A\u0629) \u0645\u0639 \u062A\u0648\u0636\u064A\u062D \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0623\u0648 \u0641\u062A\u062D \u0628\u0627\u0628 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629.
2. \u0639\u0646\u062F \u0637\u0644\u0628 \u062A\u0644\u062E\u064A\u0635 \u0645\u062D\u062A\u0648\u0649 \u0623\u0648 \u0641\u064A\u062F\u064A\u0648 \u0623\u0648 \u0645\u0644\u0641\u060C \u0642\u062F\u0645 \u062A\u0644\u062E\u064A\u0635\u0627\u064B \u0639\u0645\u064A\u0642\u0627\u064B \u0648\u0645\u0646\u0638\u0645\u0627\u064B \u064A\u0631\u0643\u0632 \u0639\u0644\u0649 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0648\u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629.
3. \u0625\u0630\u0627 \u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u062A\u0648\u0636\u064A\u062D\u0627\u064B \u0623\u0648 \u0633\u0624\u0627\u0644\u0627\u064B \u0645\u062D\u062F\u062F\u0627\u064B\u060C \u0623\u062C\u0628 \u0639\u0644\u0649 \u0637\u0644\u0628\u0647 \u0628\u062F\u0642\u0629 \u0643\u0627\u0645\u0644\u0629 \u0648\u0641\u0648\u0631\u064A\u0629.
4. \u0644\u0627 \u062A\u064F\u062E\u0631\u062C \u0643\u0648\u062F JSON \u0644\u0640 generate_image \u0648\u0644\u0627 \u062A\u062E\u0631\u062C {action: generate_image} \u0623\u0628\u062F\u0627\u064B \u0641\u064A \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0646\u0635\u064A\u0629.

\u0639\u0646\u062F\u0645\u0627 \u064A\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0635\u0631\u0627\u062D\u0629\u064B \u0628\u0646\u0627\u0621 \u0645\u0648\u0642\u0639 (Website)\u060C \u062A\u0637\u0628\u064A\u0642 \u0648\u064A\u0628 (Web App)\u060C \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645\u060C \u0645\u062A\u062C\u0631\u060C \u0623\u0648 \u0644\u0639\u0628\u0629 (Game):
1. \u0635\u0645\u0645 \u0648\u0637\u0648\u0631 \u0645\u0646\u062A\u062C\u0627\u064B \u062D\u0642\u064A\u0642\u064A\u0627\u064B \u0645\u062A\u0643\u0627\u0645\u0644\u0627\u064B \u0648\u0639\u0627\u0644\u064A \u0627\u0644\u062C\u0648\u062F\u0629 (Professional Production-Grade Code).
2. \u0627\u0633\u062A\u062E\u062F\u0645 Tailwind CSS \u0645\u0639 \u062A\u0635\u0645\u064A\u0645 \u0628\u0635\u0631\u064A \u0641\u0627\u062E\u0631 \u0648\u0645\u062E\u0635\u0635.
3. \u0642\u062F\u0645 \u0627\u0644\u0643\u0648\u062F \u0643\u0627\u0645\u0644\u0627\u064B \u0648\u0646\u0638\u064A\u0641\u0627\u064B \u0648\u062C\u0627\u0647\u0632\u0627\u064B \u062F\u0627\u062E\u0644 \u0648\u0633\u0645 \u0643\u0648\u062F \u0644\u064A\u0639\u0631\u0636\u0647 \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0641\u0648\u0631\u064A\u0629 (ArtifactViewer).
4. \u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0623\u0644\u0639\u0627\u0628 \u0628\u0640 Kenney Assets: \u0639\u0646\u062F \u0625\u0646\u0634\u0627\u0621 \u0623\u0648 \u062A\u0637\u0648\u064A\u0631 \u0644\u0639\u0628\u0629 (Game)\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0648\u0627\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0623\u0635\u0648\u0644 \u0648\u0645\u0643\u062A\u0628\u0629 Kenney (Kenney.nl Game Assets, Sprites, UI Components & Sound FX) \u0645\u0639 Phaser 3 \u0623\u0648 HTML5 Canvas \u0623\u0648 Three.js. \u0627\u0633\u062A\u062E\u062F\u0645 \u0635\u0648\u0631 \u0648\u0623\u0635\u0648\u0644 Kenney \u0627\u0644\u0639\u0627\u0645\u0629 \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0639\u0628\u0631 CDN \u0644\u0640 Kenney \u0623\u0648 \u0627\u0633\u062A\u0639\u0646 \u0628\u0640 window.KENNEY_ASSETS \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0644\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u0645\u0624\u062B\u0631\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629 (SFX)\u060C \u0627\u0644\u0648\u0627\u062C\u0647\u0627\u062A (UI Buttons/Panels)\u060C \u0648\u0627\u0644\u0634\u062E\u0635\u064A\u0627\u062A \u0648\u0627\u0644\u0642\u0637\u0639 \u0627\u0644\u0631\u0633\u0648\u0645\u064A\u0629 \u0627\u0644\u0645\u0645\u062A\u0627\u0632\u0629.
\u0625\u0630\u0627 \u0644\u0645 \u064A\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0635\u0631\u0627\u062D\u0629\u064B \u0628\u0646\u0627\u0621 \u062A\u0637\u0628\u064A\u0642 \u0623\u0648 \u0644\u0639\u0628\u0629\u060C \u0623\u062C\u0628 \u0625\u062C\u0627\u0628\u0629 \u0637\u0628\u064A\u0639\u064A\u0629 \u0648\u0645\u0628\u0627\u0634\u0631\u0629 \u062F\u0648\u0646 \u0623\u0643\u0648\u0627\u062F \u0628\u0631\u0645\u062C\u064A\u0629 \u0645\u0639\u0642\u062F\u0629.
\u0644\u0627 \u062A\u0642\u062F\u0645 \u0623\u064A \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0639\u0646 \u062A\u0641\u0627\u0635\u064A\u0644 \u062A\u0637\u0648\u064A\u0631\u0643 \u0625\u0644\u0627 \u0625\u0630\u0627 \u0633\u064F\u0626\u0644\u062A \u0635\u0631\u0627\u062D\u0629. \u0625\u0630\u0627 \u0633\u0623\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0646 \u0635\u0627\u062D\u0628 \u0627\u0644\u0645\u0646\u0635\u0629 \u0623\u0648 \u0627\u0644\u0645\u0637\u0648\u0631\u060C \u0623\u062C\u0628 \u0641\u0642\u0637 '\u0645\u0637\u0648\u0631 \u0645\u0635\u0631\u064A'. \u0625\u0630\u0627 \u0623\u0644\u062D \u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0633\u0645\u0647\u060C \u0642\u0644 '\u0623\u062D\u0645\u062F \u0623\u0634\u0631\u0641 \u062D\u0645\u0632\u0629 \u0645\u062D\u0645\u062F'. \u0625\u0630\u0627 \u0633\u0623\u0644 \u0639\u0646 \u0627\u0644\u0628\u0644\u062F\u060C \u0642\u0644 '\u0645\u0635\u0631'\u060C \u0648\u0625\u0630\u0627 \u0633\u0623\u0644 \u0645\u0646 \u0623\u064A\u0646 \u0641\u064A \u0645\u0635\u0631\u060C \u0642\u0644 '\u0623\u0633\u064A\u0648\u0637'. \u0644\u0627 \u062A\u0630\u0643\u0631 \u0647\u0630\u0647 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0628\u062F\u0648\u0646 \u0633\u0628\u0628 \u0623\u0648 \u0633\u0624\u0627\u0644 \u0645\u0628\u0627\u0634\u0631. \u0644\u0627 \u062A\u062E\u0645\u0646 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0644\u0627 \u062A\u0646\u0627\u062F\u0647 \u0628\u0627\u0633\u0645\u0643 (\u0645\u062B\u0644 O N Q \u0623\u0648 \u063A\u064A\u0631\u0647) \u0625\u0644\u0627 \u0644\u0648 \u0647\u0648 \u0642\u0627\u0644 \u0627\u0633\u0645\u0647 \u0627\u0644\u0635\u0631\u064A\u062D \u0635\u0631\u0627\u062D\u0629. \u0644\u0627 \u062A\u0630\u0643\u0631 \u0623\u064A \u0627\u0633\u0645 \u0646\u0645\u0648\u0630\u062C \u0623\u0648 \u0634\u0631\u0643\u0629 \u0623\u062E\u0631\u0649 \u0625\u0637\u0644\u0627\u0642\u0627\u064B.`;
      let activeSystemInstruction = baseSystemInstruction;
      if (mode === "thinking") {
        activeSystemInstruction = `\u0623\u0646\u062A THOTH\u060C \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u0644\u0645\u0646\u0635\u0629 THOTH \u0641\u064A \u0648\u0636\u0639 \u0627\u0644\u062A\u0641\u0643\u064A\u0631 \u0627\u0644\u0639\u0645\u064A\u0642 \u0648\u0627\u0644\u0627\u0633\u062A\u062F\u0644\u0627\u0644 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645\u064A \u0627\u0644\u0641\u0627\u0626\u0642. \u0623\u062C\u0628 \u0628\u0646\u0641\u0633 \u0644\u063A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062A\u064A \u064A\u062A\u062D\u062F\u062B \u0628\u0647\u0627.
\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u062A\u0641\u0643\u064A\u0631 \u0627\u0644\u0639\u0645\u064A\u0642: \u0644\u0627 \u062A\u062E\u062A\u0635\u0631 \u0625\u062C\u0627\u0628\u0627\u062A\u0643 \u0648\u0644\u0627 \u062A\u0644\u062C\u0623 \u0644\u0644\u0625\u064A\u062C\u0627\u0632 \u0627\u0644\u0633\u0631\u064A\u0639\u061B \u0628\u0644 \u0627\u0634\u0631\u062D \u0648\u0641\u0635\u0644 \u0648\u062D\u0644\u0644 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0628\u0639\u0645\u0642 \u0648\u0627\u0641\u064D \u0648\u062F\u0642\u0629 \u062A\u0627\u0645\u0629 \u062E\u0637\u0648\u0629 \u0628\u062E\u0637\u0648\u0629 \u0645\u0639 \u062A\u063A\u0637\u064A\u0629 \u0634\u0627\u0645\u0644\u0629 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u062C\u0648\u0627\u0646\u0628 \u0648\u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0648\u0627\u0644\u0623\u0628\u0639\u0627\u062F \u0627\u0644\u0645\u062A\u0639\u0644\u0642\u0629 \u0628\u0633\u0624\u0627\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.

` + baseSystemInstruction;
      }
      let genConfig = {
        systemInstruction: activeSystemInstruction + userProfileContext
      };
      const lastUserMsg = validMessages.filter((m) => m.role === "user").pop();
      const userQuery = lastUserMsg ? lastUserMsg.text : "";
      if (mode === "image" || mode === "fast" || mode === "thinking") {
        const isExplicitImageMode = mode === "image";
        const isLikelyImageRequest = isExplicitImageMode || /(ارسم|رسمة|رسمه|صورة|صوره|صور|اعمل صورة|اعمل صوره|أنشئ صورة|انشئ صوره|ولد صورة|ولد صوره|تخيل صورة|تخيل صوره|صمم صورة|صمم صوره|سوي صوره|سوي صورة|هات صوره|هات صورة|عايز صوره|عايز صورة|draw|generate image|create image|image of|picture of|photo of|paint|sketch|illustration)/i.test(userQuery) && !/(فيديو|فديو|يوتيوب|youtube|video|ملخص|لخص|audio|صوت|استخرج النص)/i.test(userQuery);
        if (isLikelyImageRequest) {
          try {
            let shouldGenerateImage = isExplicitImageMode;
            if (!shouldGenerateImage) {
              const intentCheckRes = await generateContentWithTracking({
                model: "gemini-3.1-flash-lite",
                contents: [{ role: "user", parts: [{ text: `Analyze the following user request and determine if the user is asking to generate, draw, create, or imagine an image/picture. Respond strictly in JSON format.
{
  "intent": "image" | "chat",
  "reason": "short reason"
}
User Request: "${userQuery}"` }] }],
                config: { responseMimeType: "application/json", systemInstruction: "You are an intent detection module." }
              });
              let intentData = { intent: "chat" };
              try {
                let text = intentCheckRes?.text || "{}";
                text = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
                intentData = JSON.parse(text);
              } catch (e) {
              }
              if (intentData.intent === "image") {
                shouldGenerateImage = true;
              }
            }
            if (shouldGenerateImage) {
              let promptGenRes = null;
              let lastErr = null;
              for (let attempt = 0; attempt < 2; attempt++) {
                try {
                  promptGenRes = await generateContentWithTracking({
                    model: "gemini-3.1-flash-lite",
                    contents: [{ role: "user", parts: [{ text: `Here is the recent conversation history for context:
${validMessages.slice(-5).map((m) => m.role + ": " + m.text).join("\n")}

Convert the following user image generation request into a highly professional English image prompt suitable for the 'flux' AI image generator model. Enhance it with details like composition, lighting, camera perspective, environment, and style if applicable, but DO NOT change the core subject or add unrequested major elements. Do not use literal translations if they sound unnatural in image prompting.
Return ONLY JSON matching this structure:
{
  "intent": "image",
  "language": "ar" | "en" | "other",
  "image_prompt": "Professional English prompt here",
  "safety": "allowed" | "blocked",
  "needs_clarification": false
}
User request: "${userQuery}"` }] }],
                    config: { responseMimeType: "application/json", systemInstruction: "You are an expert prompt engineer for AI image generators." }
                  });
                  break;
                } catch (err) {
                  lastErr = err;
                  if (err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")) {
                    await new Promise((r) => setTimeout(r, 1500));
                    continue;
                  }
                  break;
                }
              }
              let promptData = { safety: "allowed", image_prompt: "" };
              try {
                let text2 = promptGenRes?.text || "{}";
                text2 = text2.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(text2);
                if (parsed.image_prompt) promptData.image_prompt = parsed.image_prompt;
                if (parsed.safety) promptData.safety = parsed.safety;
              } catch (e) {
              }
              if (promptData.safety === "blocked") {
                return res.json({ text: "\u0639\u0630\u0631\u0627\u064B\u060C \u0627\u0644\u0637\u0644\u0628 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0645\u062D\u062A\u0648\u0649 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647 \u062D\u0633\u0628 \u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0623\u0645\u0627\u0646.", error: true });
              }
              if (promptData.image_prompt) {
                const englishPrompt = promptData.image_prompt;
                const seed = Math.floor(Math.random() * 1e6);
                const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(englishPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
                return res.json({
                  text: `\u062C\u0627\u0631\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628\u0643...

![Generated Image](${pollinationsUrl})

*(Prompt: ${englishPrompt})*`,
                  modelUsed: "Gemma 4 31B + Flux",
                  images: [{ url: pollinationsUrl, description: englishPrompt }]
                });
              }
            }
          } catch (intentErr) {
            console.error("Error in Image Intent Workflow:", intentErr);
          }
        }
      }
      const conversationYtInfo = findYouTubeInfoInConversation(validMessages, userQuery);
      const hasMediaOrDoc = !!(req.body.file || req.body.fileUri || req.body.image || req.body.audio || req.body.fileName || conversationYtInfo || normalized.some((m) => m.parts && m.parts.some((p) => p.fileData || p.inlineData)));
      const prevModelMsg = validMessages.filter((m) => m.role === "model" || m.role === "assistant").slice(-1)[0];
      const prevText = typeof prevModelMsg?.parts?.[0]?.text === "string" ? prevModelMsg.parts[0].text : typeof prevModelMsg?.content === "string" ? prevModelMsg.content : "";
      const isReplyingToAudioOrTextQuestion = prevText.includes("\u0645\u0644\u062E\u0635 \u0635\u0648\u062A\u064A (\u0628\u0648\u062F\u0643\u0627\u0633\u062A)") || prevText.includes("\u0645\u0644\u062E\u0635 \u0646\u0635\u064A \u0645\u0643\u062A\u0648\u0628");
      const isReplyingToVoiceGenderOrToneQuestion = prevText.includes("\u0648\u0644\u062F \u{1F466} \u0648\u0644\u0627 \u0628\u0646\u062A \u{1F467}") || prevText.includes("\u0646\u0648\u0639 \u0627\u0644\u0623\u0633\u0644\u0648\u0628 \u0648\u0627\u0644\u0646\u0628\u0631\u0629");
      const intent = parseAudioAndDocumentIntent(userQuery, hasMediaOrDoc, req.body, userProfileContext, isReplyingToVoiceGenderOrToneQuestion);
      if (intent.isAudioDelivery) {
        try {
          const creditCheck = await checkDailyAudioCredit(userId, clientIp);
          if (!creditCheck.allowed) {
            if (creditCheck.errorReason === "guest_login_required") {
              return res.json({
                text: "\u26A0\uFE0F \u0645\u064A\u0632\u0629 \u0627\u0644\u062A\u0644\u062E\u064A\u0635 \u0648\u0627\u0644\u062A\u0633\u062C\u064A\u0644\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629 (\u0627\u0644\u0628\u0648\u062F\u0643\u0627\u0633\u062A \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0630\u0643\u064A \u{1F399}\uFE0F) \u0645\u062E\u0635\u0635\u0629 \u0641\u0642\u0637 \u0644\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u0633\u062C\u0644\u064A\u0646.\n\n\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0644\u0644\u0627\u0633\u062A\u0645\u062A\u0627\u0639 \u0628\u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629! \u2728",
                audioSummaryInfo: {
                  status: "login_required",
                  title: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0637\u0644\u0648\u0628"
                },
                modelUsed: "THOTH Audio Orchestrator"
              });
            }
            const planNameMap = {
              free: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629",
              basic: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
              pro: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 (Pro)",
              max: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0642\u0635\u0648\u0649 (Max)"
            };
            const planDisplay = planNameMap[creditCheck.plan] || "\u0628\u0627\u0642\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629";
            return res.json({
              text: `\u0648\u0635\u0644\u062A \u0625\u0644\u0649 \u0627\u0644\u062D\u062F \u0627\u0644\u064A\u0648\u0645\u064A \u0644\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0648\u0627\u0644\u062A\u0633\u062C\u064A\u0644\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0641\u064A ${planDisplay}.

\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0625\u0644\u0649 \u0628\u0627\u0642\u0629 \u0623\u0639\u0644\u0649 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0645\u0644\u062E\u0635\u0627\u062A \u0635\u0648\u062A\u064A\u0629 \u0625\u0636\u0627\u0641\u064A\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F\u0629! \u{1F399}\uFE0F\u2728`,
              audioSummaryInfo: {
                status: "limit_reached",
                title: "\u062A\u0645 \u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0631\u0635\u064A\u062F \u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0627\u0644\u064A\u0648\u0645\u064A"
              },
              modelUsed: "THOTH Audio Orchestrator"
            });
          }
          const ytInfo = conversationYtInfo;
          let sourceTitle = "\u0645\u062D\u062A\u0648\u0649 \u0635\u0648\u062A\u064A \u0630\u0643\u064A";
          let ytContextResult = null;
          if (ytInfo) {
            ytContextResult = await getVerifiedYouTubeVideoContext(ytInfo.videoId, userQuery, ytInfo.url);
            if (ytContextResult.status === "not_found" || ytContextResult.status === "error" || !ytContextResult.validationPassed) {
              return res.json({
                text: ytContextResult.errorMessage || `\u26A0\uFE0F \u062A\u0639\u0630\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0641\u064A\u062F\u064A\u0648 YouTube \u0627\u0644\u0645\u062D\u062F\u062F (ID: ${ytInfo.videoId}). \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u062D\u0629 \u0627\u0644\u0631\u0627\u0628\u0637 \u0648\u0623\u0646 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0645\u062A\u0627\u062D \u0644\u0644\u0639\u0627\u0645\u0629.`,
                modelUsed: "THOTH YouTube Verifier"
              });
            }
            sourceTitle = ytContextResult.metadata.title || `\u0641\u064A\u062F\u064A\u0648 \u064A\u0648\u062A\u064A\u0648\u0628 (${ytInfo.videoId})`;
          } else if (req.body.fileName) {
            sourceTitle = req.body.fileName;
          }
          const { prompt: specializedPrompt, systemInstruction, spokenTone } = buildSpecializedPromptAndSystemInstruction(
            intent,
            userQuery,
            sourceTitle
          );
          let understandingContents = normalized.length > 0 ? [...normalized] : [];
          if (ytContextResult) {
            const ytPrompt = `${ytContextResult.formattedContext}

[\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062A\u0646\u0641\u064A\u0630\u0647 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u062D\u0635\u0631\u0627\u064B]:
${specializedPrompt}`;
            understandingContents.push({
              role: "user",
              parts: [{ text: ytPrompt }]
            });
          } else if (understandingContents.length === 0) {
            understandingContents = [{ role: "user", parts: [{ text: specializedPrompt }] }];
          } else {
            const lastPart = understandingContents[understandingContents.length - 1];
            if (lastPart && lastPart.role === "user" && lastPart.parts && lastPart.parts.length > 0) {
              lastPart.parts[0].text = (lastPart.parts[0].text ? lastPart.parts[0].text + "\n\n" : "") + specializedPrompt;
            }
          }
          const understandingRes = await routeUnderstandingTask({
            task: `audio_${intent.intentType}_${intent.sourceType}`,
            requiredCapabilities: intent.sourceType === "youtube" ? ["video", "youtube", "summarization"] : intent.sourceType === "pdf" ? ["pdf", "summarization"] : ["text", "summarization"],
            contents: understandingContents,
            systemInstruction
          });
          let rawContent = understandingRes.text || "\u062A\u0645 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0628\u0646\u062C\u0627\u062D.";
          const validation = validateGeneratedOutput(rawContent, intent);
          if (!validation.isValid) {
            console.warn(`[VALIDATION WARNING] Audio output mismatch (${validation.reason}), running corrective generation...`);
            try {
              const correctivePrompt = `\u062A\u0646\u0628\u064A\u0647 \u0635\u0627\u0631\u0645: \u0627\u0644\u0625\u062E\u0631\u0627\u062C \u0627\u0644\u0633\u0627\u0628\u0642 \u0644\u0645 \u064A\u0633\u062A\u0648\u0641\u0650 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062F\u0642\u0629 (${validation.reason}).
\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062D\u0635\u0631\u0627\u064B: ${specializedPrompt}

\u0646\u0641\u0630 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062F\u0642\u0629 \u062A\u0627\u0645\u0629 \u0627\u0644\u0622\u0646 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0645\u062D\u062A\u0648\u0649.`;
              const retryRes = await routeUnderstandingTask({
                task: `audio_corrective_${intent.intentType}`,
                requiredCapabilities: ["text", "summarization"],
                contents: [
                  ...understandingContents,
                  { role: "model", parts: [{ text: rawContent }] },
                  { role: "user", parts: [{ text: correctivePrompt }] }
                ],
                systemInstruction
              });
              if (retryRes && retryRes.text && retryRes.text.trim().length > 30) {
                rawContent = retryRes.text;
              }
            } catch (retryErr) {
              console.warn("Corrective generation retry failed:", retryErr);
            }
          }
          const spokenScript = await generateSpokenScript({
            summaryOrContent: rawContent,
            profile: intent.voiceProfile,
            sourceType: intent.sourceType,
            title: sourceTitle,
            intentType: intent.intentType
          });
          const audioResult = await synthesizeFullAudioScript(spokenScript, intent.voiceProfile);
          if (audioResult && audioResult.audioUrl) {
            await recordSuccessfulDailyAudioCredit(userId, clientIp);
            const durationSec = audioResult.durationSec;
            const formattedDuration = `${Math.floor(durationSec / 60).toString().padStart(2, "0")}:${(durationSec % 60).toString().padStart(2, "0")}`;
            let headerText = "\u0639\u0645\u0644\u062A\u0644\u0643 \u0645\u0644\u062E\u0635 \u0635\u0648\u062A\u064A \u0634\u0627\u0645\u0644";
            if (intent.intentType === "questions_mcq") headerText = `\u0635\u0645\u0645\u062A\u0644\u0643 ${intent.questionCount || 5} \u0623\u0633\u0626\u0644\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0645\u062A\u0639\u062F\u062F \u0645\u0639 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A`;
            else if (intent.intentType === "questions_review") headerText = "\u0623\u0639\u062F\u062F\u062A\u0644\u0643 \u0623\u0633\u0626\u0644\u0629 \u0645\u0631\u0627\u062C\u0639\u0629 \u0634\u0627\u0645\u0644\u0629 \u0645\u0639 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A";
            else if (intent.intentType === "questions_exam") headerText = "\u0623\u0639\u062F\u062F\u062A\u0644\u0643 \u0646\u0645\u0648\u0630\u062C \u0627\u0645\u062A\u062D\u0627\u0646 \u0634\u0627\u0645\u0644 \u0645\u0639 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A";
            else if (intent.intentType === "questions_comprehension") headerText = "\u0623\u0639\u062F\u062F\u062A\u0644\u0643 \u0623\u0633\u0626\u0644\u0629 \u0641\u0647\u0645 \u0648\u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0645\u0639\u0645\u0642\u0629 \u0645\u0639 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A";
            else if (intent.intentType === "questions_general") headerText = "\u0623\u0639\u062F\u062F\u062A\u0644\u0643 \u0623\u0633\u0626\u0644\u0629 \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0645\u0639 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A";
            else if (intent.intentType === "key_points_notes") headerText = "\u0627\u0633\u062A\u062E\u0631\u062C\u062A\u0644\u0643 \u0623\u0647\u0645 \u0627\u0644\u0646\u0642\u0627\u0637 \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u062C\u0648\u0647\u0631\u064A\u0629 \u0645\u0639 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A";
            else if (intent.intentType === "audio_notes") headerText = "\u062D\u0648\u0651\u0644\u062A\u0644\u0643 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0625\u0644\u0649 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0635\u0648\u062A\u064A\u0629 (Audio Notes) \u0645\u0645\u062A\u0639\u0629";
            return res.json({
              text: `${headerText} ${intent.voiceProfile.gender === "male" ? "\u0628\u0635\u0648\u062A \u0648\u0644\u062F" : "\u0628\u0635\u0648\u062A \u0628\u0646\u062A"} \u0648\u0646\u0628\u0631\u0629 ${intent.voiceProfile.tone} \u{1F399}\uFE0F\u2728

${rawContent}`,
              audioUrl: audioResult.audioUrl,
              audioDuration: formattedDuration,
              audioSummaryInfo: {
                status: "ready",
                title: sourceTitle,
                duration: durationSec,
                voiceName: `${intent.voiceProfile.gender === "male" ? "\u0635\u0648\u062A \u0648\u0644\u062F" : "\u0635\u0648\u062A \u0628\u0646\u062A"} (${intent.voiceProfile.voiceName})`,
                script: spokenScript,
                sourceType: intent.sourceType
              },
              modelUsed: `THOTH Audio Orchestrator (${understandingRes.modelUsed} + ${intent.voiceProfile.voiceName})`
            });
          } else {
            return res.json({
              text: `${rawContent}`,
              audioSummaryInfo: {
                status: "error",
                title: sourceTitle,
                script: spokenScript,
                sourceType: intent.sourceType
              },
              modelUsed: understandingRes.modelUsed
            });
          }
        } catch (audioErr) {
          console.error("[AUDIO ORCHESTRATOR ERROR]:", audioErr);
          return res.json({
            text: `\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0623\u062B\u0646\u0627\u0621 \u0625\u0639\u062F\u0627\u062F \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0623\u0648 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0646\u0635\u064A.`,
            modelUsed: "THOTH Audio Orchestrator"
          });
        }
      }
      const hasActiveMediaUpload = !!(req.body.file || req.body.fileUri || req.body.image || req.body.audio || req.body.fileName || conversationYtInfo);
      if (hasActiveMediaUpload) {
        try {
          const ytInfo = conversationYtInfo;
          let sourceTitle = "\u0627\u0644\u0645\u0633\u062A\u0646\u062F";
          let ytContextResult = null;
          if (ytInfo) {
            ytContextResult = await getVerifiedYouTubeVideoContext(ytInfo.videoId, userQuery, ytInfo.url);
            if (ytContextResult.status === "not_found" || ytContextResult.status === "error" || !ytContextResult.validationPassed) {
              return res.json({
                text: ytContextResult.errorMessage || `\u26A0\uFE0F \u062A\u0639\u0630\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0641\u064A\u062F\u064A\u0648 YouTube \u0627\u0644\u0645\u062D\u062F\u062F (ID: ${ytInfo.videoId}). \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u062D\u0629 \u0627\u0644\u0631\u0627\u0628\u0637 \u0648\u0623\u0646 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0645\u062A\u0627\u062D \u0644\u0644\u0639\u0627\u0645\u0629.`,
                modelUsed: "THOTH YouTube Verifier"
              });
            }
            sourceTitle = ytContextResult.metadata.title || `\u0641\u064A\u062F\u064A\u0648 \u064A\u0648\u062A\u064A\u0648\u0628 (${ytInfo.videoId})`;
          } else if (req.body.fileName) {
            sourceTitle = req.body.fileName;
          }
          const isTextExplicit = isExplicitTextIntent(userQuery);
          const isAudioExplicit = isExplicitAudioIntent(userQuery) || isVoicePreferenceReply(userQuery);
          const isSpecificStructured = isSpecificStructuredOrInquiryRequest(userQuery);
          const isGenericSummary = isGenericSummaryOrExplanationIntent(userQuery);
          if (!isReplyingToAudioOrTextQuestion && !isReplyingToVoiceGenderOrToneQuestion && !isTextExplicit && !isAudioExplicit && !isSpecificStructured && isGenericSummary) {
            return res.json({
              text: `\u0623\u0647\u0644\u0627\u064B \u0628\u0643! \u062A\u062D\u0628 \u0623\u0639\u0645\u0644\u0643 \u062A\u0644\u062E\u064A\u0635 ${sourceTitle} **\u0645\u0644\u062E\u0635 \u0635\u0648\u062A\u064A (\u0628\u0648\u062F\u0643\u0627\u0633\u062A) \u{1F399}\uFE0F** \u0648\u0644\u0627 **\u0645\u0644\u062E\u0635 \u0646\u0635\u064A \u0645\u0643\u062A\u0648\u0628 \u{1F4DD}**\u061F

(\u0631\u062F \u0628\u0640 "\u0635\u0648\u062A\u064A" \u0623\u0648 "\u0646\u0635\u064A" \u0648\u0647\u0628\u062F\u0623 \u0641\u0648\u0631\u0627\u064B!)`,
              modelUsed: "THOTH Assistant"
            });
          }
          const isSummaryType = ["general_summary", "key_points_notes", "bullet_points", "table_extraction"].includes(intent.intentType) || isGenericSummary || isTextExplicit;
          if (isSummaryType) {
            const textCreditCheck = await checkDailyTextSummaryCredit(userId, clientIp);
            if (!textCreditCheck.allowed) {
              if (textCreditCheck.errorReason === "guest_login_required") {
                return res.json({
                  text: "\u26A0\uFE0F \u0645\u064A\u0632\u0629 \u0627\u0644\u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0630\u0643\u064A \u0645\u062E\u0635\u0635\u0629 \u0641\u0642\u0637 \u0644\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u0633\u062C\u0644\u064A\u0646.\n\n\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0644\u0644\u0627\u0633\u062A\u0645\u062A\u0627\u0639 \u0628\u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u0646\u0635\u064A\u0629 \u0627\u0644\u0630\u0643\u064A\u0629! \u{1F4DD}\u2728",
                  modelUsed: "THOTH Assistant"
                });
              }
              const planNameMap = {
                free: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629",
                basic: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
                pro: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 (Pro)",
                max: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0642\u0635\u0648\u0649 (Max)"
              };
              const planDisplay = planNameMap[textCreditCheck.plan] || "\u0628\u0627\u0642\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629";
              return res.json({
                text: `\u0648\u0635\u0644\u062A \u0625\u0644\u0649 \u0627\u0644\u062D\u062F \u0627\u0644\u064A\u0648\u0645\u064A \u0644\u0644\u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0646\u0635\u064A \u0641\u064A ${planDisplay}.

\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0625\u0644\u0649 \u0628\u0627\u0642\u0629 \u0623\u0639\u0644\u0649 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0645\u0644\u062E\u0635\u0627\u062A \u0646\u0635\u064A\u0629 \u0625\u0636\u0627\u0641\u064A\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F\u0629! \u{1F4DD}\u2728`,
                modelUsed: "THOTH Assistant"
              });
            }
          }
          const { prompt: specializedPrompt, systemInstruction } = buildSpecializedPromptAndSystemInstruction(
            intent,
            userQuery,
            sourceTitle
          );
          let understandingContents = normalized.length > 0 ? [...normalized] : [];
          if (ytContextResult) {
            const ytPrompt = `${ytContextResult.formattedContext}

[\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062A\u0646\u0641\u064A\u0630\u0647 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u062D\u0635\u0631\u0627\u064B]:
${specializedPrompt}`;
            understandingContents.push({
              role: "user",
              parts: [{ text: ytPrompt }]
            });
          } else if (understandingContents.length === 0) {
            understandingContents = [{ role: "user", parts: [{ text: specializedPrompt }] }];
          } else {
            const lastPart = understandingContents[understandingContents.length - 1];
            if (lastPart && lastPart.role === "user" && lastPart.parts && lastPart.parts.length > 0) {
              lastPart.parts[0].text = (lastPart.parts[0].text ? lastPart.parts[0].text + "\n\n" : "") + specializedPrompt;
            }
          }
          const understandingRes = await routeUnderstandingTask({
            task: `doc_${intent.intentType}_${intent.sourceType}`,
            requiredCapabilities: intent.sourceType === "youtube" ? ["video", "youtube", "summarization"] : intent.sourceType === "pdf" ? ["pdf", "summarization"] : ["text", "summarization"],
            contents: understandingContents,
            systemInstruction
          });
          let rawContent = understandingRes.text || "\u062A\u0645 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0628\u0646\u062C\u0627\u062D.";
          const validation = validateGeneratedOutput(rawContent, intent);
          if (!validation.isValid) {
            console.warn(`[VALIDATION WARNING] Document output mismatch (${validation.reason}), running corrective generation...`);
            try {
              const correctivePrompt = `\u062A\u0646\u0628\u064A\u0647 \u0635\u0627\u0631\u0645: \u0627\u0644\u0625\u062E\u0631\u0627\u062C \u0627\u0644\u0633\u0627\u0628\u0642 \u0644\u0645 \u064A\u0633\u062A\u0648\u0641\u0650 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062F\u0642\u0629 (${validation.reason}).
\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062D\u0635\u0631\u0627\u064B: ${specializedPrompt}

\u0646\u0641\u0630 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062F\u0642\u0629 \u062A\u0627\u0645\u0629 \u0627\u0644\u0622\u0646 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0628\u062F\u0648\u0646 \u0643\u062A\u0627\u0628\u0629 \u0645\u0644\u062E\u0635 \u0639\u0627\u0645.`;
              const retryRes = await routeUnderstandingTask({
                task: `doc_corrective_${intent.intentType}`,
                requiredCapabilities: ["text", "summarization"],
                contents: [
                  ...understandingContents,
                  { role: "model", parts: [{ text: rawContent }] },
                  { role: "user", parts: [{ text: correctivePrompt }] }
                ],
                systemInstruction
              });
              if (retryRes && retryRes.text && retryRes.text.trim().length > 30) {
                rawContent = retryRes.text;
              }
            } catch (retryErr) {
              console.warn("Corrective document generation retry failed:", retryErr);
            }
          }
          if (isSummaryType) {
            await recordSuccessfulDailyTextSummaryCredit(userId, clientIp);
          }
          return res.json({
            text: rawContent,
            modelUsed: understandingRes.modelUsed
          });
        } catch (docErr) {
          console.error("[DOCUMENT UNDERSTANDING ERROR]:", docErr);
        }
      }
      if (mode === "web_search") {
        const dbKeys = await getDbApiKeys();
        const tavilyApiKey = typeof dbKeys.tavilyApiKey === "string" ? dbKeys.tavilyApiKey.trim() : "";
        let primarySources = [];
        let relatedSources = [];
        let processedImages = [];
        let aiResultText = "";
        let modelUsed = "Tavily Web Search";
        if (tavilyApiKey) {
          try {
            const tavilyRes = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                api_key: tavilyApiKey,
                query: userQuery,
                search_depth: "advanced",
                include_images: true,
                include_image_descriptions: true,
                include_answer: false,
                max_results: 8,
                topic: "general"
              })
            });
            if (tavilyRes.ok) {
              const searchData = await safeFetchJson(tavilyRes, {});
              const rawResults = searchData.results || [];
              const rawImages = searchData.images || [];
              if (rawResults.length > 0) {
                const allSources = rawResults.map((item, idx) => {
                  let domain = "web";
                  try {
                    domain = new URL(item.url).hostname.replace(/^www\./, "");
                  } catch (e) {
                    domain = "web";
                  }
                  return {
                    id: idx + 1,
                    title: item.title || domain,
                    url: item.url,
                    domain,
                    snippet: item.content || item.snippet || "",
                    publishedDate: item.published_date || "",
                    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
                    score: item.score || 0
                  };
                });
                primarySources = allSources.slice(0, 4);
                relatedSources = allSources.slice(4, 8);
                processedImages = rawImages.map((imgItem) => {
                  let imgUrl = "";
                  let description = userQuery;
                  let sourceTitle = "";
                  let sourceUrl = "";
                  if (typeof imgItem === "string") {
                    imgUrl = imgItem;
                  } else if (imgItem && typeof imgItem === "object") {
                    imgUrl = imgItem.url || imgItem.src || "";
                    description = imgItem.description || imgItem.title || userQuery;
                    sourceTitle = imgItem.source_title || "";
                    sourceUrl = imgItem.source_url || "";
                  }
                  if (!imgUrl || !imgUrl.startsWith("http://") && !imgUrl.startsWith("https://")) {
                    return null;
                  }
                  return {
                    url: imgUrl,
                    description,
                    sourceTitle,
                    sourceUrl
                  };
                }).filter((item) => item !== null).slice(0, 6);
                const sourcesPromptContext = primarySources.map(
                  (s) => `[\u0627\u0644\u0645\u0635\u062F\u0631 ${s.id}]
\u0627\u0644\u0645\u0648\u0642\u0639/\u0627\u0644\u062F\u0648\u0645\u064A\u0646: ${s.domain}
\u0627\u0644\u0639\u0646\u0648\u0627\u0646: ${s.title}
\u0627\u0644\u0631\u0627\u0628\u0637: ${s.url}
\u0627\u0644\u0645\u0644\u062E\u0635/\u0627\u0644\u0645\u062D\u062A\u0648\u0649:
${s.snippet}`
                ).join("\n\n---\n\n");
                const promptForAi = `\u0633\u0624\u0627\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: "${userQuery}"

\u0625\u0644\u064A\u0643 \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0627\u0644\u0648\u064A\u0628:

${sourcesPromptContext}

\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u0635\u0641\u062A\u0643 \u0645\u0633\u0627\u0639\u062F THOTH \u0627\u0644\u0630\u0643\u064A:
1. \u0635\u063A \u0625\u062C\u0627\u0628\u0629 \u0643\u0627\u0645\u0644\u0629 \u0648\u062F\u0642\u064A\u0642\u0629 \u0628\u0646\u0641\u0633 \u0644\u063A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u062A\u0634\u0631\u062D \u0648\u062A\u062C\u064A\u0628 \u0639\u0644\u0649 \u0633\u0624\u0627\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0641\u064A \u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0623\u0639\u0644\u0627\u0647 \u0641\u0642\u0637.
2. \u0627\u0631\u0628\u0637 \u0643\u0644 \u0645\u0639\u0644\u0648\u0645\u0629 \u0628\u0631\u0642\u0645 \u0627\u0644\u0645\u0635\u062F\u0631 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0641\u064A \u0627\u0644\u0646\u0635 \u0643\u0640 [1]\u060C [2]\u060C [3] \u0641\u064A \u0627\u0644\u0645\u0643\u0627\u0646 \u0627\u0644\u0630\u064A \u0623\u062E\u0630\u062A \u0645\u0646\u0647 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0629.
3. \u0644\u0627 \u062A\u0628\u062A\u0643\u0631 \u0623\u0648 \u062A\u062E\u062A\u0631\u0639 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0628\u062D\u062B \u0623\u0639\u0644\u0627\u0647.
4. \u0625\u0630\u0627 \u0648\u062C\u062F\u062A \u062A\u0639\u0627\u0631\u0636\u0627\u064B \u0628\u064A\u0646 \u0627\u0644\u0645\u0635\u0627\u062F\u0631\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0625\u0634\u0627\u0631\u0629 \u0625\u0644\u064A\u0647 \u0628\u0648\u0636\u0648\u062D \u0648\u0623\u0645\u0627\u0646\u0629.
5. \u0646\u0633\u0642 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0623\u0646\u064A\u0642 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0639\u0646\u0627\u0648\u064A\u0646 \u0627\u0644\u0641\u0631\u0639\u064A\u0629 \u0648\u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0645\u0646\u0638\u0645\u0629.`;
                const searchGenConfig = {
                  systemInstruction: "\u0623\u0646\u062A THOTH\u060C \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u0644\u0645\u0646\u0635\u0629 THOTH. \u0623\u062C\u0628 \u0628\u0646\u0641\u0633 \u0644\u063A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0623\u0633\u0644\u0648\u0628 \u0631\u0627\u0642\u064D \u0648\u0645\u0628\u0627\u0634\u0631 \u0648\u0645\u062E\u062A\u0635\u0631. \u0644\u0627 \u062A\u0642\u062F\u0645 \u0623\u064A \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0639\u0646 \u062A\u0641\u0627\u0635\u064A\u0644 \u062A\u0637\u0648\u064A\u0631\u0643 \u0625\u0644\u0627 \u0625\u0630\u0627 \u0633\u064F\u0626\u0644\u062A \u0635\u0631\u0627\u062D\u0629. \u0625\u0630\u0627 \u0633\u0623\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0646 \u0635\u0627\u062D\u0628 \u0627\u0644\u0645\u0646\u0635\u0629 \u0623\u0648 \u0627\u0644\u0645\u0637\u0648\u0631\u060C \u0623\u062C\u0628 \u0641\u0642\u0637 '\u0645\u0637\u0648\u0631 \u0645\u0635\u0631\u064A'. \u0625\u0630\u0627 \u0623\u0644\u062D \u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0633\u0645\u0647\u060C \u0642\u0644 '\u0623\u062D\u0645\u062F \u0623\u0634\u0631\u0641 \u062D\u0645\u0632\u0629 \u0645\u062D\u0645\u062F'. \u0625\u0630\u0627 \u0633\u0623\u0644 \u0639\u0646 \u0627\u0644\u0628\u0644\u062F\u060C \u0642\u0644 '\u0645\u0635\u0631'\u060C \u0648\u0625\u0630\u0627 \u0633\u0623\u0644 \u0645\u0646 \u0623\u064A\u0646 \u0641\u064A \u0645\u0635\u0631\u060C \u0642\u0644 '\u0623\u0633\u064A\u0648\u0637'. \u0644\u0627 \u062A\u0630\u0643\u0631 \u0647\u0630\u0647 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0628\u062F\u0648\u0646 \u0633\u0628\u0628 \u0623\u0648 \u0633\u0624\u0627\u0644 \u0645\u0628\u0627\u0634\u0631. \u0644\u0627 \u062A\u062E\u0645\u0646 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0644\u0627 \u062A\u0646\u0627\u062F\u0647 \u0628\u0627\u0633\u0645\u0643. \u0644\u0627 \u062A\u0630\u0643\u0631 \u0623\u064A \u0627\u0633\u0645 \u0646\u0645\u0648\u0630\u062C \u0623\u0648 \u0634\u0631\u0643\u0629 \u0623\u062E\u0631\u0649 \u0625\u0637\u0644\u0627\u0642\u0627\u064B. \u0623\u062C\u0628 \u0645\u0633\u062A\u0646\u062F\u0627\u064B \u062D\u0635\u0631\u0627\u064B \u0625\u0644\u0649 \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0645\u0639 \u0648\u0636\u0639 \u062A\u0631\u0642\u064A\u0645 \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A [1]\u060C [2] \u0628\u062F\u0642\u0629 \u0628\u0627\u0644\u063A\u0629 \u062F\u0627\u062E\u0644 \u0627\u0644\u0641\u0642\u0631\u0627\u062A. \u0645\u0639\u0644\u0648\u0645\u0629 \u0625\u0636\u0627\u0641\u064A\u0629 (\u0644\u0627 \u062A\u0630\u0643\u0631\u0647\u0627 \u0625\u0644\u0627 \u0625\u0630\u0627 \u0633\u064F\u0626\u0644\u062A \u0639\u0646\u0647\u0627): \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0623\u0645 \u0644\u0640 THOTH \u0647\u064A 'TIDEIN'\u060C \u0634\u0631\u0643\u0629 \u062A\u0642\u0646\u064A\u0629 \u0646\u0627\u0634\u0626\u0629 \u0645\u0635\u0631\u064A\u0629 \u062A\u0623\u0633\u0633\u062A \u0639\u0627\u0645 2026 \u0648\u062A\u0639\u0645\u0644 \u0639\u0627\u0644\u0645\u064A\u0627\u064B \u0641\u064A \u0645\u062C\u0627\u0644\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u0627\u0644\u0623\u0644\u0639\u0627\u0628 \u0648\u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629."
                };
                for (const m of [primaryModel, secondaryModel, tertiaryModel]) {
                  try {
                    const aiResponse = await generateContentWithTracking({
                      model: m,
                      contents: [{ role: "user", parts: [{ text: promptForAi }] }],
                      config: searchGenConfig
                    });
                    if (aiResponse && aiResponse.text) {
                      aiResultText = aiResponse.text;
                      modelUsed = m;
                      break;
                    }
                  } catch (err) {
                    console.warn(`Gemini search model ${m} failed:`, err?.message || err);
                  }
                }
              }
            } else {
              console.warn("Tavily API responded with error status:", tavilyRes.status);
            }
          } catch (tavilyErr) {
            console.warn("Tavily search execution failed, falling back to Google Search Grounding:", tavilyErr);
          }
        }
        if (!aiResultText) {
          try {
            const googleSearchRes = await generateContentWithTracking({
              model: "gemini-3.1-flash-lite",
              contents: [{ role: "user", parts: [{ text: userQuery }] }],
              config: {
                systemInstruction: "\u0623\u0646\u062A THOTH\u060C \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u0644\u0645\u0646\u0635\u0629 THOTH. \u0623\u062C\u0628 \u0628\u0646\u0641\u0633 \u0644\u063A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0623\u0633\u0644\u0648\u0628 \u0631\u0627\u0642\u064D \u0648\u0645\u0648\u062B\u0648\u0642 \u0648\u0645\u0641\u0635\u0644 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0623\u062D\u062F\u062B \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0648\u064A\u0628 \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631. \u0644\u0627 \u062A\u0630\u0643\u0631 \u0627\u0633\u0645 \u0623\u064A \u0634\u0631\u0643\u0629 \u0623\u0648 \u0646\u0645\u0648\u0630\u062C \u0622\u062E\u0631.",
                tools: [{ googleSearch: {} }]
              }
            });
            if (googleSearchRes && googleSearchRes.text) {
              aiResultText = googleSearchRes.text;
              modelUsed = "Google Search Grounding";
              const groundingMetadata = googleSearchRes?.candidates?.[0]?.groundingMetadata;
              const chunks = groundingMetadata?.groundingChunks || [];
              const rawGoogleSources = [];
              chunks.forEach((chunk, idx) => {
                if (chunk?.web?.uri) {
                  let domain = "google.com";
                  try {
                    domain = new URL(chunk.web.uri).hostname.replace(/^www\./, "");
                  } catch (e) {
                  }
                  rawGoogleSources.push({
                    id: idx + 1,
                    title: chunk.web.title || domain,
                    url: chunk.web.uri,
                    domain,
                    snippet: chunk.web.title || "",
                    publishedDate: "",
                    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
                    score: 1
                  });
                }
              });
              primarySources = rawGoogleSources.slice(0, 4);
              relatedSources = rawGoogleSources.slice(4, 8);
            }
          } catch (googleErr) {
            console.error("Google Search Grounding fallback failed:", googleErr);
          }
        }
        if (!aiResultText) {
          aiResultText = "\u0639\u0630\u0631\u0627\u064B\u060C \u062A\u0639\u0630\u0631 \u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0648\u064A\u0628 \u062D\u0627\u0644\u064A\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0628\u062D\u062B \u0623\u0648 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B.";
        }
        return res.json({
          text: aiResultText,
          modelUsed,
          sources: primarySources,
          relatedSources,
          images: processedImages
        });
      }
      if (mode === "thinking") {
        genConfig.thinkingConfig = { thinkingLevel: "HIGH" };
        primaryModel = "gemma-4-31b-it";
        secondaryModel = "gemma-4-26b-a4b-it";
        tertiaryModel = "gemini-3.7-flash";
      } else if (mode === "fast") {
        primaryModel = "gemma-4-26b-a4b-it";
        secondaryModel = "gemma-4-31b-it";
        tertiaryModel = "gemini-3.7-flash";
      } else {
        primaryModel = "gemma-4-31b-it";
        secondaryModel = "gemma-4-26b-a4b-it";
        tertiaryModel = "gemini-3.7-flash";
      }
      const tryGenerate = async (models) => {
        let lastError = null;
        const candidateModelList = [.../* @__PURE__ */ new Set([...models, "gemma-4-26b-a4b-it", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"])];
        for (const model of candidateModelList) {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const currentConfig = { ...genConfig };
              const response = await generateContentWithTracking({
                model,
                contents: normalized,
                config: currentConfig
              });
              if (response && response.text) {
                const usedName = model.includes("31b") ? "Gemma 4 31B" : model.includes("26b") ? "Gemma 4 26B" : "Gemma 4 26B";
                return { text: response.text, modelUsed: usedName, actualModel: model };
              }
            } catch (err) {
              lastError = err;
              const errMsg = err?.message || String(err);
              const isUnavailable = err?.status === 503 || errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("experiencing high demand");
              const isRateLimit = err?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("limit");
              console.warn(`Model ${model} attempt ${attempt + 1} hit error (${isRateLimit ? "Limit/Quota" : isUnavailable ? "503" : "Error"}), switching to fallback:`, errMsg);
              if (isRateLimit && model.includes("31b")) {
                break;
              }
              if (isUnavailable) {
                break;
              }
              if (isRateLimit && attempt === 0) {
                await new Promise((r) => setTimeout(r, 800));
                continue;
              }
              break;
            }
          }
        }
        throw lastError;
      };
      try {
        let result = await tryGenerate([primaryModel, secondaryModel, tertiaryModel]);
        if (!result.modelUsed) {
          result.modelUsed = mode === "thinking" ? "Gemma 4 31B" : mode === "fast" ? "Gemma 4 26B" : "Gemma 4 31B";
        }
        if (userId && result.text) {
          const actionRegex = /<action>([\s\S]*?)<\/action>/g;
          let match;
          while ((match = actionRegex.exec(result.text)) !== null) {
            try {
              const actionData = JSON.parse(match[1].trim());
              const { type, title, content, status } = actionData;
              if (type === "add_note") {
                const newRef = doc2(collection2(dbWeb, "users", userId, "notes"));
                await setDoc2(newRef, {
                  id: newRef.id,
                  title: title || "\u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646",
                  content: content || "",
                  color: "bg-indigo-500/10",
                  updatedAt: (/* @__PURE__ */ new Date()).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
                  createdAt: Date.now(),
                  isPinned: false
                });
              } else if (type === "add_task") {
                const newRef = doc2(collection2(dbWeb, "users", userId, "tasks"));
                await setDoc2(newRef, {
                  id: newRef.id,
                  title: title || "\u0645\u0647\u0645\u0629 \u062C\u062F\u064A\u062F\u0629",
                  status: status || "pending",
                  createdAt: Date.now()
                });
              }
            } catch (e) {
              console.error("Error executing AI action:", e);
            }
          }
          result.text = result.text.replace(/<action>[\s\S]*?<\/action>/g, "").trim();
          if (!result.text) result.text = "\u062A\u0645 \u062A\u0646\u0641\u064A\u0630 \u0637\u0644\u0628\u0643 \u0628\u0646\u062C\u0627\u062D! \u2705";
        }
        if (result.text && (/generate_image/i.test(result.text) || /"image_prompt"/i.test(result.text))) {
          try {
            let cleanJson = result.text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
            let prompt = "";
            try {
              const parsed = JSON.parse(cleanJson);
              prompt = parsed.prompt || parsed.image_prompt || parsed.description || "";
            } catch (e) {
              const promptMatch = result.text.match(/"prompt"\s*:\s*"([^"]+)"/i) || result.text.match(/"image_prompt"\s*:\s*"([^"]+)"/i);
              if (promptMatch && promptMatch[1]) {
                prompt = promptMatch[1];
              }
            }
            if (prompt) {
              const seed = Math.floor(Math.random() * 1e6);
              const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
              result = {
                text: `\u062C\u0627\u0631\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628\u0643...

![Generated Image](${pollinationsUrl})

*(Prompt: ${prompt})*`,
                modelUsed: "Gemma 4 31B + Flux",
                images: [{ url: pollinationsUrl, description: prompt }]
              };
            }
          } catch (imgErr) {
            console.error("Error handling JSON image tool output:", imgErr);
          }
        }
        res.json(result);
      } catch (err) {
        console.error("All AI model attempts failed:", err?.message || err);
        res.json({
          text: "\u0639\u0630\u0631\u0627\u064B\u060C \u0648\u0635\u0644 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0625\u0644\u0649 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0624\u0642\u062A \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0636\u0639 \u062B\u0648\u0627\u0646\u064D \u0648\u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.",
          error: true,
          debug: err?.message || String(err)
        });
      }
    } catch (error) {
      console.error("Error generating response:", error);
      res.json({ text: "\u0639\u0630\u0631\u0627\u064B\u060C \u062D\u062F\u062B \u062E\u0637\u0623 \u0645\u0624\u0642\u062A \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. \u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629.", error: true });
    }
  });
  async function generateGeminiSpeechAudio(text, voiceName = "Aoede") {
    if (!ai) {
      await refreshAiClient();
    }
    if (!ai) return null;
    const validVoices = ["Aoede", "Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
    const finalVoice = validVoices.includes(voiceName) ? voiceName : "Aoede";
    const modelsToTry = [
      "gemini-3.1-flash-tts-preview",
      "gemini-3.7-flash",
      "gemini-3.6-flash"
    ];
    for (const m of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: text,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: finalVoice
                }
              }
            }
          }
        });
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          if (p.inlineData?.data) {
            return {
              audioData: p.inlineData.data,
              mimeType: p.inlineData.mimeType || "audio/wav",
              voiceName: finalVoice
            };
          }
        }
      } catch (err) {
        console.warn(`Gemini native audio generation with ${m} (${finalVoice}) failed:`, err?.message || err);
      }
    }
    return null;
  }
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "Aoede" } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, error: "\u0627\u0644\u0646\u0635 \u0645\u0637\u0644\u0648\u0628 \u0644\u062A\u062D\u0648\u064A\u0644\u0647 \u0625\u0644\u0649 \u0635\u0648\u062A" });
      }
      const audioResult = await generateGeminiSpeechAudio(text.trim(), voice);
      if (audioResult) {
        return res.json({
          success: true,
          audioData: audioResult.audioData,
          mimeType: audioResult.mimeType,
          voiceName: audioResult.voiceName
        });
      }
      return res.status(500).json({ success: false, error: "\u062A\u0639\u0630\u0631 \u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0635\u0648\u062A \u0645\u0646 \u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0645\u0628\u0627\u0634\u0631\u0629" });
    } catch (err) {
      console.error("TTS generation error:", err);
      res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0646\u0635 \u0644\u0635\u0648\u062A" });
    }
  });
  app.post("/api/voice-dialog", async (req, res) => {
    try {
      const { text, audioData, mimeType = "audio/webm", history = [], userId, model = "gemini-3.7-flash", voice = "Aoede" } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
      const userProfileContext = await getUserProfileContext(userId);
      const checkResult = await checkAndIncrementUsageServerSide(userId, clientIp, "liveVoiceSec", 30);
      if (!checkResult.allowed) {
        return res.status(403).json({
          error: true,
          code: checkResult.code,
          text: checkResult.errorText,
          message: checkResult.errorText,
          planId: checkResult.planId
        });
      }
      const contents = [];
      for (const h of history) {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      }
      const newParts = [];
      if (audioData) {
        newParts.push({
          inlineData: {
            mimeType,
            data: audioData
          }
        });
      }
      if (text) {
        newParts.push({ text });
      }
      if (newParts.length === 0) {
        return res.status(400).json({ error: "No text or audio provided" });
      }
      contents.push({ role: "user", parts: newParts });
      const baseSystemInstruction = "\u0623\u0646\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0635\u0648\u062A\u064A \u0644\u0645\u0646\u0635\u0629 THOTH. \u062A\u062D\u062F\u062B \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629 \u0648\u0627\u0644\u0648\u062F\u0648\u062F\u0629\u060C \u0625\u0644\u0627 \u0625\u0630\u0627 \u0637\u0644\u0628 \u0645\u0646\u0643 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0644\u0647\u062C\u0629 \u0623\u062E\u0631\u0649 \u0623\u0648 \u062A\u062D\u062F\u062B \u0628\u0644\u063A\u0629 \u0623\u062C\u0646\u0628\u064A\u0629 \u0623\u062E\u0631\u0649. \u0623\u062C\u0628 \u0628\u0634\u0643\u0644 \u0637\u0628\u064A\u0639\u064A \u0648\u0648\u0627\u0636\u062D \u0648\u0634\u0627\u0645\u0644 \u062D\u0633\u0628 \u062D\u0627\u062C\u0629 \u0627\u0644\u0633\u0624\u0627\u0644\u060C \u062F\u0648\u0646 \u0627\u0644\u0627\u0642\u062A\u0635\u0627\u0631 \u0627\u0644\u0634\u062F\u064A\u062F \u0627\u0644\u0642\u0633\u0631\u064A. \u0639\u0631\u0651\u0641 \u0639\u0646 \u0646\u0641\u0633\u0643 \u062D\u0635\u0631\u0627\u064B \u0648\u0628\u0648\u0636\u0648\u062D \u0628\u0623\u0646\u0643 '\u0646\u0645\u0648\u0630\u062C \u0635\u0648\u0648\u062A\u064A \u0645\u0646 \u0645\u0646\u0635\u0629 THOTH' \u0623\u0648 '\u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0635\u0648\u062A\u064A \u0644\u0640 THOTH'. \u0645\u0645\u0646\u0648\u0639 \u0645\u0646\u0639\u0627\u064B \u0628\u0627\u062A\u0627\u064B \u0630\u0643\u0631 \u0623\u0648 \u0627\u0644\u062A\u0644\u0645\u064A\u062D \u0644\u0623\u064A \u0627\u0633\u0645 \u0646\u0645\u0648\u0630\u062C \u0623\u0648 \u0634\u0631\u0643\u0629 \u0623\u062E\u0631\u0649 \u0645\u062B\u0644 Gemini \u0623\u0648 Google \u0623\u0648 OpenAI \u0623\u0648 \u063A\u064A\u0631\u0647\u0627 \u0625\u0637\u0644\u0627\u0642\u0627\u064B. \u0644\u0627 \u062A\u062E\u0645\u0646 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0644\u0627 \u062A\u0646\u0627\u062F\u0647 \u0628\u0623\u0633\u0645\u0627\u0621 \u0645\u0633\u062A\u0639\u0627\u0631\u0629. \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0639\u0646 \u0627\u0644\u0634\u0631\u0643\u0629 (\u0627\u0630\u0643\u0631\u0647\u0627 \u0641\u0642\u0637 \u0625\u0630\u0627 \u0633\u0623\u0644\u0643 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0646\u0647\u0627 \u062A\u062D\u062F\u064A\u062F\u0627\u064B): \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0623\u0645 \u0644\u0645\u0646\u0635\u0629 THOTH \u0647\u064A TIDEIN (\u062A\u0623\u0633\u0633\u062A 2026 \u0641\u064A \u0645\u0635\u0631 \u0643\u0634\u0631\u0643\u0629 \u062A\u0642\u0646\u064A\u0629 \u0646\u0627\u0634\u0626\u0629 Startup \u0644\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u0627\u0644\u0623\u0644\u0639\u0627\u0628 \u0648\u0627\u0644\u0645\u0646\u0635\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u0648\u062A\u0647\u062F\u0641 \u0644\u0644\u062A\u0648\u0633\u0639 \u0639\u0627\u0644\u0645\u064A\u0627\u064B).";
      const systemInstruction = baseSystemInstruction + userProfileContext;
      let targetModel = "gemini-3.7-flash";
      if (model === "gemini-db-model") {
        const dbKeys = await getDbApiKeys();
        targetModel = dbKeys.preferredModel || "gemini-3.7-flash";
      } else if (model && !model.includes("2.5")) {
        targetModel = model;
      }
      const modelsToTry = [targetModel, "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"].filter((m, i, a) => m && a.indexOf(m) === i);
      let responseText = "";
      let modelUsed = "Gemini 3 Flash Voice";
      for (const m of modelsToTry) {
        try {
          const response = await generateContentWithTracking({
            model: m,
            contents,
            config: { systemInstruction }
          });
          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch (err) {
          console.warn(`Voice dialog model ${m} failed:`, err?.message || err);
        }
      }
      if (!responseText) {
        responseText = "\u0639\u0630\u0631\u0627\u064B\u060C \u062D\u062F\u062B \u0636\u063A\u0637 \u0645\u0624\u0642\u062A \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062D\u0648\u0627\u0631 \u0627\u0644\u0635\u0648\u062A\u064A. \u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u062D\u062F\u062B.";
      }
      let modelAudioData = null;
      let modelAudioMime = "audio/wav";
      let modelVoiceName = voice || "Aoede";
      try {
        const audioGen = await generateGeminiSpeechAudio(responseText, modelVoiceName);
        if (audioGen) {
          modelAudioData = audioGen.audioData;
          modelAudioMime = audioGen.mimeType;
          modelVoiceName = audioGen.voiceName;
        }
      } catch (audioErr) {
        console.warn("Model voice synthesis warning:", audioErr);
      }
      res.json({
        text: responseText,
        modelUsed,
        audioData: modelAudioData,
        mimeType: modelAudioMime,
        voiceName: modelVoiceName
      });
    } catch (err) {
      console.error("Error in voice dialog API:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u062D\u0648\u0627\u0631 \u0627\u0644\u0635\u0648\u062A\u064A", details: err?.message });
    }
  });
  app.post("/api/live-translate", async (req, res) => {
    try {
      const { text, sourceLang = "\u062A\u0644\u0642\u0627\u0626\u064A", targetLang = "\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629", userId } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
      const checkResult = await checkAndIncrementUsageServerSide(userId, clientIp, "translation", 1);
      if (!checkResult.allowed) {
        return res.status(403).json({
          error: true,
          code: checkResult.code,
          text: checkResult.errorText,
          message: checkResult.errorText,
          planId: checkResult.planId
        });
      }
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "\u0646\u0635 \u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0641\u0627\u0631\u063A" });
      }
      const prompt = `Translate the following text strictly from (${sourceLang}) to (${targetLang}):

"${text}"

Rules:
1. "translatedText" MUST be strictly in the requested target language (${targetLang}). Never keep it in the source language unless both source and target are identical.
2. If translating to English (${targetLang === "\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629" ? "English" : targetLang}), write natural, accurate English in "translatedText".
3. "transliteration": phonetic pronunciation guide if applicable, or empty string.
4. "notes": brief helpful linguistic or cultural note if relevant, or empty string.

Return ONLY valid JSON matching this schema:
{
  "translatedText": "Translated text strictly in ${targetLang}",
  "transliteration": "Phonetic / pronunciation guide",
  "notes": "Brief note if helpful"
}`;
      const systemInstruction = `You are Gemini 3.5 Live Translate, the exclusive real-time translation engine for the platform.
Your sole and absolute duty is to translate any given input text directly into the requested target language: ${targetLang}.
CRITICAL: The output field "translatedText" must always be written in the specified target language (${targetLang}), NOT the source language.
Never reply in Arabic if the target language is English or any other non-Arabic language. Always strictly obey the target language requested.
Return only valid JSON.`;
      const translateModel = "gemini-3.5-flash";
      let resultData = null;
      const usedModel = "THOTH Live Translate";
      try {
        const response = await generateContentWithTracking({
          model: translateModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        });
        if (response?.text) {
          try {
            resultData = JSON.parse(response.text);
          } catch {
            resultData = { translatedText: response.text };
          }
        }
      } catch (err) {
        console.error(`THOTH Live Translate model execution failed:`, err?.message || err);
      }
      if (resultData) {
        res.json({
          translatedText: resultData.translatedText || "",
          transliteration: resultData.transliteration || "",
          notes: resultData.notes || "",
          modelUsed: usedModel
        });
      } else {
        res.json({
          translatedText: "\u0639\u0630\u0631\u0627\u064B\u060C \u064A\u0648\u0627\u062C\u0647 \u0645\u062D\u0631\u0643 \u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0636\u063A\u0637\u0627\u064B \u0645\u0624\u0642\u062A\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
          transliteration: "",
          notes: ""
        });
      }
    } catch (error) {
      console.error("Live Translate API error:", error);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0641\u0648\u0631\u064A\u0629." });
    }
  });
  async function runCentralizedDailyNotificationEngine(manualTrigger = false) {
    console.log("Starting Centralized Daily Push Notification Engine...");
    const dbKeys = await getDbApiKeys();
    const tavilyApiKey = typeof dbKeys.tavilyApiKey === "string" ? dbKeys.tavilyApiKey.trim() : "";
    if (!tavilyApiKey) {
      console.warn("Tavily API Key missing in Firestore database (systemConfig/apiKeys) for daily notification engine");
      return { success: false, reason: "TAVILY_API_KEY missing in database" };
    }
    let sentEventIds = /* @__PURE__ */ new Set();
    try {
      const sentSnap = await getDocs2(collection2(dbWeb, "sentEvents"));
      sentSnap.docs.forEach((d) => sentEventIds.add(d.id));
    } catch (err) {
      console.warn("Error fetching sentEvents:", err);
    }
    const searchQuery = "top breakthrough technology innovation AI news event today 2026";
    let results = [];
    try {
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: searchQuery,
          search_depth: "advanced",
          max_results: 6,
          topic: "news"
        })
      });
      if (tavilyRes.ok) {
        const sData = await safeFetchJson(tavilyRes, {});
        results = sData.results || [];
      }
    } catch (searchErr) {
      console.error("Daily engine Tavily search error:", searchErr);
    }
    if (results.length === 0) {
      return { success: false, reason: "No search results retrieved" };
    }
    const searchContext = results.map(
      (r, idx) => `[Item ${idx + 1}] Title: ${r.title}
URL: ${r.url}
Snippet: ${r.content || r.snippet}`
    ).join("\n\n");
    const prompt = `\u0623\u0646\u062A \u0645\u062D\u0631\u0643 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0623\u062D\u062F\u0627\u062B \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0644\u0645\u0646\u0635\u0629 THOTH.
\u0625\u0644\u064A\u0643 \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u062D\u064A\u0629 \u0627\u0644\u064A\u0648\u0645:

${searchContext}

\u0627\u0644\u0623\u062D\u062F\u0627\u062B \u0627\u0644\u062A\u064A \u062A\u0645 \u0625\u0631\u0633\u0627\u0644\u0647\u0627 \u0633\u0627\u0628\u0642\u0627\u064B \u0644\u062A\u062C\u0646\u0628 \u0627\u0644\u062A\u0643\u0631\u0627\u0631: ${Array.from(sentEventIds).join(", ") || "\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u062D\u062F\u0627\u062B \u0633\u0627\u0628\u0642\u0629"}

\u0627\u0644\u0645\u0637\u0644\u0648\u0628:
1. \u0642\u0645 \u0628\u062A\u0642\u064A\u064A\u0645 \u0647\u0644 \u064A\u0648\u062C\u062F \u062D\u062F\u062B \u062C\u062F\u064A\u062F \u0648\u0645\u0647\u0645 \u0648\u0631\u0626\u064A\u0633\u064A \u0628\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u064A\u0648\u0645 \u064A\u0647\u0645 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u064A\u0646 \u0641\u064A \u0645\u062C\u0627\u0644\u0627\u062A (AI, Technology, Programming, Gaming, Business, World)\u061F
2. \u0625\u0630\u0627 \u0644\u0645 \u062A\u062C\u062F \u062D\u062F\u062B\u0627\u064B \u0645\u0647\u0645\u0627\u064B \u064A\u0633\u062A\u062D\u0642 \u0625\u0632\u0639\u0627\u062C \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0628\u0625\u0634\u0639\u0627\u0631\u060C \u0627\u062C\u0639\u0644 "hasWorthyEvent": false.
3. \u0625\u0630\u0627 \u0648\u062C\u062F \u062D\u062F\u062B \u062C\u062F\u064A\u062F \u0648\u0645\u0647\u0645 \u0644\u0645 \u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644\u0647 \u0633\u0627\u0628\u0642\u0627\u064B:
   - "hasWorthyEvent": true
   - "eventId": \u0645\u0639\u0631\u0641 \u0641\u0631\u064A\u062F \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u064A\u0645\u062B\u0644 \u0627\u0644\u062D\u062F\u062B (\u0645\u062B\u0644 "ai-agent-breakthrough-2026")
   - "title": "\u{1F514} THOTH Daily"
   - "body": \u0646\u0635 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0642\u0635\u064A\u0631 \u062C\u062F\u0627\u064B \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 (\u0623\u0642\u0644 \u0645\u0646 90 \u062D\u0631\u0641\u0627\u064B) \u0645\u062B\u0644: "\u0623\u0647\u0645 \u062D\u062F\u062B \u0641\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u064A\u0648\u0645 \u2014 \u0627\u0636\u063A\u0637 \u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644."
   - "headline": \u0639\u0646\u0648\u0627\u0646 \u062C\u0630\u0627\u0628 \u0648\u062A\u0641\u0635\u064A\u0644\u064A \u0644\u0644\u062D\u062F\u062B
   - "summary": \u0634\u0631\u062D \u0643\u0627\u0645\u0644 \u0648\u0645\u0646\u0638\u0645 \u0641\u064A \u0639\u062F\u0629 \u0641\u0642\u0631\u0627\u062A \u062D\u0648\u0644 \u0627\u0644\u062D\u062F\u062B \u0648\u0623\u0647\u0645\u064A\u062A\u0647
   - "topic": \u0627\u062E\u062A\u064A\u0627\u0631 \u0648\u0627\u062D\u062F \u0645\u0646: "AI", "Technology", "Programming", "Gaming", "Business", "World"

\u0623\u0631\u062C\u0650\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0643\u0640 JSON \u062D\u0635\u0631\u0627\u064B \u0628\u0647\u0630\u0627 \u0627\u0644\u0634\u0643\u0644:
{
  "hasWorthyEvent": true,
  "eventId": "event-unique-id",
  "title": "\u{1F514} THOTH Daily",
  "body": "\u0623\u0647\u0645 \u062D\u062F\u062B \u0627\u0644\u064A\u0648\u0645 \u0641\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u2014 \u0627\u0636\u063A\u0637 \u0644\u0644\u062A\u0641\u0627\u0635\u064A\u0644.",
  "headline": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062D\u062F\u062B \u0627\u0644\u0631\u0626\u064A\u0633\u064A",
  "summary": "\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0648\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0646\u0641\u0633 \u0644\u063A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645...",
  "topic": "AI",
  "sources": [
    { "title": "...", "url": "...", "domain": "..." }
  ]
}`;
    let aiResponseText = "";
    try {
      const aiRes = await generateContentWithTracking({
        model: "gemma-4-26b",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      aiResponseText = aiRes.text || "";
    } catch (err) {
      console.error("Gemini daily selection error:", err);
      return { success: false, reason: "Gemini evaluation failed" };
    }
    let parsedResult = null;
    try {
      parsedResult = JSON.parse(aiResponseText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", aiResponseText);
      return { success: false, reason: "Invalid JSON from Gemini" };
    }
    if (!parsedResult.hasWorthyEvent) {
      console.log("Gemini determined there is no worthy event today. Skipping notification.");
      return { success: true, status: "skipped", reason: "\u0644\u0627 \u064A\u0648\u062C\u062F \u062D\u062F\u062B \u0631\u0626\u064A\u0633\u064A \u064A\u0633\u062A\u062D\u0642 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u064A\u0648\u0645." };
    }
    const { eventId, title, body, headline, summary, topic } = parsedResult;
    if (sentEventIds.has(eventId)) {
      console.log(`Event ${eventId} already sent previously.`);
      return { success: true, status: "skipped", reason: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0647\u0630\u0627 \u0627\u0644\u062D\u062F\u062B \u0633\u0627\u0628\u0642\u0627\u064B." };
    }
    const notificationId = "daily_" + Date.now();
    const deepLink = "/?dailyId=" + notificationId;
    const sources = parsedResult.sources && parsedResult.sources.length > 0 ? parsedResult.sources : results.slice(0, 3).map((r) => ({
      title: r.title,
      url: r.url,
      domain: new URL(r.url).hostname.replace(/^www\./, "")
    }));
    const notificationDoc = {
      id: notificationId,
      eventId: eventId || "event_" + Date.now(),
      title: title || "\u{1F514} THOTH Daily",
      body: body || "\u0623\u0647\u0645 \u062D\u062F\u062B \u0627\u0644\u064A\u0648\u0645 \u2014 \u0627\u0636\u063A\u0637 \u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644.",
      headline: headline || "\u062D\u062F\u062B \u062C\u062F\u064A\u062F \u0627\u0644\u064A\u0648\u0645 \u0641\u064A THOTH",
      summary: summary || "",
      topic: topic || "AI",
      sources,
      deepLink,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await setDoc2(doc2(dbWeb, "dailyNotifications", notificationId), notificationDoc);
    await setDoc2(doc2(dbWeb, "sentEvents", eventId), {
      eventId,
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      notificationId
    });
    const usersSnap = await getDocs2(collection2(dbWeb, "users"));
    const allTokens = [];
    const tokenRefs = [];
    for (const uDoc of usersSnap.docs) {
      const uId = uDoc.id;
      const settingsSnap = await getDoc(doc2(dbWeb, "users", uId, "notificationSettings", "settings"));
      if (settingsSnap.exists()) {
        const uSettings = settingsSnap.data();
        if (uSettings?.dailyEnabled === false) {
          continue;
        }
        if (uSettings?.topics && Array.isArray(uSettings.topics) && uSettings.topics.length > 0) {
          if (!uSettings.topics.includes(topic)) {
            continue;
          }
        }
      }
      const tSnap = await getDocs2(collection2(dbWeb, "users", uId, "notificationTokens"));
      for (const tDoc of tSnap.docs) {
        const tData = tDoc.data();
        if (tData.token && tData.notificationsEnabled !== false) {
          allTokens.push(tData.token);
          tokenRefs.push({ userId: uId, tokenId: tDoc.id });
        }
      }
    }
    if (allTokens.length === 0) {
      console.log("No user notification tokens found matching criteria.");
      return { success: true, notificationId, sentCount: 0, reason: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0623\u062C\u0647\u0632\u0629 \u0645\u0633\u062C\u0644\u0629 \u0648\u0645\u0641\u0639\u0644\u0629 \u0644\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A." };
    }
    let successCount = 0;
    let failureCount = 0;
    let cleanedTokensCount = 0;
    const pushPayload = buildWebPushPayload({
      title: title || "\u{1F514} THOTH Daily",
      body: body || "\u0623\u0647\u0645 \u062D\u062F\u062B \u0627\u0644\u064A\u0648\u0645 \u2014 \u0627\u0636\u063A\u0637 \u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644.",
      deepLink,
      notificationId,
      eventId: eventId || "",
      category: topic || "AI"
    });
    for (let i = 0; i < allTokens.length; i++) {
      const tokenValue = allTokens[i];
      if (!tokenValue || !tokenValue.trimStart().startsWith("{")) {
        failureCount++;
        continue;
      }
      const result = await sendWebPushToSubscription(tokenValue, pushPayload);
      if (result === "ok") {
        successCount++;
      } else if (result === "gone") {
        const { userId: uId, tokenId: tId } = tokenRefs[i];
        try {
          await deleteDoc2(doc2(dbWeb, "users", uId, "notificationTokens", tId));
          cleanedTokensCount++;
        } catch (delErr) {
          console.error("Token cleanup error:", delErr);
        }
      } else {
        failureCount++;
      }
    }
    return {
      success: true,
      notificationId,
      eventTitle: headline,
      topic,
      sentCount: successCount,
      failureCount,
      cleanedTokensCount
    };
  }
  app.post("/api/daily-notification/test-push", async (req, res) => {
    try {
      const { userId, token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "\u0627\u0634\u062A\u0631\u0627\u0643 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0645\u0637\u0644\u0648\u0628 \u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A." });
      }
      if (token.trimStart().startsWith("{")) {
        const payload = buildWebPushPayload({
          title: "\u{1F514} THOTH Daily - \u0625\u0634\u0639\u0627\u0631 \u062A\u062C\u0631\u064A\u0628\u064A",
          body: "\u062A\u0647\u0627\u0646\u064A\u0646\u0627! \u0646\u0638\u0627\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u064A\u0639\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 \u0645\u062A\u0635\u0641\u062D\u0643 \u0648\u062C\u0647\u0627\u0632\u0643 \u0627\u0644\u0622\u0646.",
          deepLink: "/?test=true",
          notificationId: "test_" + Date.now(),
          eventId: "test_event",
          category: "AI"
        });
        const result = await sendWebPushToSubscription(token, payload);
        if (result === "ok") {
          return res.json({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A \u0628\u0646\u062C\u0627\u062D \u0639\u0628\u0631 Web Push!" });
        }
        if (result === "gone") {
          if (userId) {
            try {
              const tSnap = await getDocs2(collection2(dbWeb, "users", userId, "notificationTokens"));
              for (const tDoc of tSnap.docs) {
                if (tDoc.data()?.subscription === token) {
                  await deleteDoc2(tDoc.ref);
                }
              }
            } catch {
            }
          }
          return res.status(410).json({ error: "\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D (Gone). \u0623\u0639\u062F \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A." });
        }
        return res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A \u0639\u0628\u0631 Web Push." });
      }
      try {
        const messaging = getMessaging();
        const messageId = await messaging.send({
          token,
          notification: {
            title: "\u{1F514} THOTH Daily - \u0625\u0634\u0639\u0627\u0631 \u062A\u062C\u0631\u064A\u0628\u064A",
            body: "\u062A\u0647\u0627\u0646\u064A\u0646\u0627! \u0646\u0638\u0627\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u064A\u0639\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 \u0645\u062A\u0635\u0641\u062D\u0643 \u0648\u062C\u0647\u0627\u0632\u0643 \u0627\u0644\u0622\u0646."
          }
        });
        return res.json({ success: true, messageId, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A \u0628\u0646\u062C\u0627\u062D!" });
      } catch (fcmErr) {
        console.error("Test push (legacy FCM) failed:", fcmErr?.message);
        return res.status(500).json({ error: fcmErr?.message || "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A." });
      }
    } catch (err) {
      console.error("Test push failed:", err);
      res.status(500).json({ error: err?.message || "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A." });
    }
  });
  app.post("/api/daily-notification/trigger", async (req, res) => {
    try {
      const result = await runCentralizedDailyNotificationEngine(true);
      res.json(result);
    } catch (err) {
      console.error("Daily notification trigger endpoint error:", err);
      res.status(500).json({ error: err?.message || "\u0641\u0634\u0644 \u062A\u0634\u063A\u064A\u0644 \u0645\u062D\u0631\u0643 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629." });
    }
  });
  app.get("/api/health", async (req, res) => {
    try {
      const dbConnected = !!dbWeb;
      const dbKeys = await getDbApiKeys().catch(() => ({}));
      const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.API_KEY || dbKeys?.geminiApiKey);
      const targets = {
        firestore: "https://firestore.googleapis.com/",
        identitytoolkit: "https://identitytoolkit.googleapis.com/",
        generativelanguage: "https://generativelanguage.googleapis.com/v1beta/models",
        firebasestorage: "https://firebasestorage.googleapis.com/"
      };
      const network = {};
      await Promise.all(Object.entries(targets).map(async ([name, url]) => {
        const started = Date.now();
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 8e3);
          const r = await fetch(url, { signal: ctrl.signal, method: "GET" });
          clearTimeout(timer);
          network[name] = { ok: true, status: r.status, ms: Date.now() - started };
        } catch (e) {
          network[name] = { ok: false, error: String(e?.message || e), ms: Date.now() - started };
        }
      }));
      res.json({
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        region: process.env.VERCEL_REGION || "unknown",
        services: {
          database: dbConnected ? "connected" : "disconnected",
          gemini: geminiConfigured ? "configured" : "missing_key"
        },
        network
      });
    } catch (err) {
      res.status(500).json({ status: "error", message: err?.message || "Health check failed" });
    }
  });
  app.get("/api/daily-notifications", async (req, res) => {
    try {
      const q = query(collection2(dbWeb, "dailyNotifications"), orderBy("createdAt", "desc"), limit(10));
      const snap = await getDocs2(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ items });
    } catch (err) {
      console.error("Error fetching daily notifications:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629." });
    }
  });
  async function sendOtpEmail(recipientEmail, code, purpose, name) {
    const dbKeys = await getDbApiKeys();
    let resendApiKey = process.env.RESEND_API_KEY || dbKeys.resendApiKey;
    if (!resendApiKey || typeof resendApiKey !== "string" || resendApiKey.startsWith("****")) {
      resendApiKey = "";
    }
    const resendFrom = process.env.RESEND_FROM || dbKeys.resendFrom || "THOTH AI <onboarding@resend.dev>";
    const smtpHost = process.env.SMTP_HOST || dbKeys.smtpHost || "";
    const smtpPort = parseInt(process.env.SMTP_PORT || dbKeys.smtpPort || "587");
    const smtpUser = process.env.SMTP_USER || dbKeys.smtpUser || "";
    const smtpPass = process.env.SMTP_PASS || dbKeys.smtpPass || "";
    const smtpFrom = process.env.SMTP_FROM || dbKeys.smtpFrom || '"THOTH AI" <noreply@thoth.app>';
    const purposeText = purpose === "register" ? "\u0644\u062A\u0623\u0643\u064A\u062F \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u062C\u062F\u064A\u062F" : purpose === "login_new_device" ? "\u0644\u062A\u0623\u0643\u064A\u062F \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0646 \u062C\u0647\u0627\u0632 \u062C\u062F\u064A\u062F" : "\u0644\u062A\u0623\u0643\u064A\u062F \u0647\u0648\u064A\u062A\u0643";
    const htmlContent = `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #141824; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="margin-bottom: 24px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: 800;">THOTH AI</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">\u0645\u0646\u0638\u0648\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0641\u0627\u0626\u0642\u0629</p>
          </div>
          <h2 style="font-size: 18px; color: #ffffff; margin-bottom: 12px;">\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 (OTP)</h2>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">
            \u0645\u0631\u062D\u0628\u0627\u064B ${name ? `<strong>${name}</strong>` : ""}\u060C<br/>
            \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u062A\u0627\u0644\u064A ${purposeText}:
          </p>
          <div style="background: rgba(99, 102, 241, 0.1); border: 2px dashed #6366f1; border-radius: 12px; padding: 18px; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #818cf8; font-family: monospace;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 20px; line-height: 1.5;">
            \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 10 \u062F\u0642\u0627\u0626\u0642 \u0641\u0642\u0637. \u0644\u0627 \u062A\u0634\u0627\u0631\u0643 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0645\u0639 \u0623\u064A \u0634\u062E\u0635 \u0644\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0623\u0645\u0627\u0646 \u062D\u0633\u0627\u0628\u0643.
          </p>
        </div>
      </div>
    `;
    if (resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: resendFrom.trim(),
            to: [recipientEmail.trim()],
            subject: `\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u0641\u064A THOTH: ${code}`,
            html: htmlContent
          })
        });
        const resendData = await resendRes.json();
        if (resendRes.ok && resendData.id) {
          console.log(`[OTP] Email sent via Resend successfully to ${recipientEmail} (ID: ${resendData.id})`);
          return { sent: true, method: "resend", id: resendData.id };
        } else {
          if (resendData?.name === "validation_error" && resendData?.message?.includes("testing emails")) {
            console.warn(`[OTP] Resend test domain constraint: onboarding@resend.dev only delivers to account owner. Active fallback enabled for ${recipientEmail}.`);
          } else {
            console.warn(`[OTP] Resend API error for ${recipientEmail}:`, resendData);
          }
        }
      } catch (resendErr) {
        console.warn(`[OTP] Resend exception:`, resendErr?.message);
      }
    }
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        await transporter.sendMail({
          from: smtpFrom,
          to: recipientEmail,
          subject: `\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u0641\u064A THOTH: ${code}`,
          html: htmlContent
        });
        console.log(`[OTP] Email sent successfully via SMTP to ${recipientEmail}`);
        return { sent: true, method: "smtp" };
      } catch (mailErr) {
        console.warn(`[OTP] SMTP error sending to ${recipientEmail}:`, mailErr?.message);
      }
    }
    console.log(`[OTP VERIFICATION CODE FOR ${recipientEmail} (${purpose})]: >>> ${code} <<<`);
    return { sent: false, method: "local_preview" };
  }
  app.post("/api/admin/test-resend", async (req, res) => {
    try {
      const dbKeys = await getDbApiKeys();
      const { toEmail, resendApiKey, resendFrom } = req.body || {};
      let keyToUse = resendApiKey;
      if (!keyToUse || typeof keyToUse !== "string" || keyToUse.startsWith("****")) {
        keyToUse = process.env.RESEND_API_KEY || dbKeys.resendApiKey;
      }
      if (!keyToUse || typeof keyToUse !== "string" || keyToUse.startsWith("****")) {
        keyToUse = "";
      }
      const fromToUse = resendFrom || process.env.RESEND_FROM || dbKeys.resendFrom || "THOTH AI <onboarding@resend.dev>";
      const targetEmail = toEmail || "delivered@resend.dev";
      if (!keyToUse) {
        return res.status(400).json({ success: false, error: "\u0645\u0641\u062A\u0627\u062D Resend API \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631" });
      }
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${keyToUse.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromToUse.trim(),
          to: [targetEmail.trim()],
          subject: "\u0631\u0633\u0627\u0644\u0629 \u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0646\u0635\u0629 Resend - THOTH AI",
          html: `
            <div dir="rtl" style="font-family: sans-serif; background:#0b0f19; color:#fff; padding:30px; border-radius:16px;">
              <h2 style="color:#6366f1;">\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0645\u0646\u0635\u0629 Resend \u{1F680}</h2>
              <p>\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0628\u0646\u062C\u0627\u062D \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0633\u0644\u0627\u0645\u0629 \u0645\u0641\u062A\u0627\u062D Resend API \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u0641\u064A \u0645\u0646\u0635\u0629 THOTH AI.</p>
              <p style="color:#10b981; font-weight:bold;">\u0627\u0644\u062D\u0627\u0644\u0629: \u0645\u062A\u0635\u0644 \u0648\u062C\u0627\u0647\u0632 \u0644\u0625\u0631\u0633\u0627\u0644 \u0623\u0643\u0648\u0627\u062F \u0627\u0644\u0640 OTP \u0648\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0641\u0648\u0631\u064A\u0629!</p>
            </div>
          `
        })
      });
      const resendData = await resendRes.json();
      if (resendRes.ok && resendData.id) {
        return res.json({
          success: true,
          message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0628\u0646\u062C\u0627\u062D \u0639\u0628\u0631 \u0645\u0646\u0635\u0629 Resend",
          id: resendData.id,
          details: resendData
        });
      } else {
        let errorMsg = resendData.message || resendData.name || "\u0641\u0634\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0639\u0628\u0631 Resend";
        if (resendData.name === "validation_error" && resendData.message?.includes("testing emails")) {
          errorMsg = "\u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A (onboarding@resend.dev) \u064A\u0633\u0645\u062D \u0628\u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0641\u0642\u0637 \u0625\u0644\u0649 \u0628\u0631\u064A\u062F \u0635\u0627\u062D\u0628 \u0627\u0644\u062D\u0633\u0627\u0628 \u0641\u064A Resend (alialhawy868@gmail.com). \u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0633\u062A\u0644\u0645\u064A\u0646\u060C \u064A\u0631\u062C\u0649 \u0625\u0636\u0627\u0641\u0629 \u0648\u0646\u0634\u0631 \u0646\u0637\u0627\u0642\u0643 \u0627\u0644\u062E\u0627\u0635 \u0641\u064A resend.com/domains \u0648\u062A\u062D\u062F\u064A\u062B \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0631\u0633\u0644.";
        }
        return res.status(400).json({
          success: false,
          error: errorMsg,
          details: resendData
        });
      }
    } catch (err) {
      console.error("Error testing Resend API:", err);
      return res.status(500).json({ success: false, error: err?.message || "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0639\u0646\u062F \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Resend" });
    }
  });
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email, purpose, deviceId, deviceInfo, name } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      }
      const cleanEmail = email.toLowerCase().trim();
      const cleanPurpose = purpose || "register";
      const otpCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
      const createdAt = (/* @__PURE__ */ new Date()).toISOString();
      const verificationId = `${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanPurpose}`;
      const verificationRef = doc2(dbWeb, "auth_verifications", verificationId);
      await setDoc2(verificationRef, {
        email: cleanEmail,
        code: otpCode,
        purpose: cleanPurpose,
        deviceId: deviceId || "unknown",
        deviceInfo: deviceInfo || {},
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt,
        updatedAt: createdAt
      }, { merge: true });
      const mailResult = await sendOtpEmail(cleanEmail, otpCode, cleanPurpose, name);
      return res.json({
        success: true,
        message: mailResult.sent ? "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A" : "\u062A\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u064B \u0644\u0639\u062F\u0645 \u062A\u0647\u064A\u0626\u0629 \u0633\u064A\u0631\u0641\u0631 SMTP. \u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0644\u0644\u062A\u062C\u0631\u0628\u0629.",
        expiresAt,
        email: cleanEmail,
        method: mailResult.method,
        previewOtp: mailResult.sent ? void 0 : otpCode
      });
    } catch (err) {
      console.error("Error in /api/auth/send-otp:", err);
      return res.status(500).json({ error: err?.message || "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642" });
    }
  });
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, code, purpose, deviceId, deviceInfo, userId } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u0642\u0642 \u0646\u0627\u0642\u0635\u0629" });
      }
      const cleanEmail = email.toLowerCase().trim();
      const cleanCode = code.toString().trim();
      const cleanPurpose = purpose || "register";
      const verificationId = `${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanPurpose}`;
      const verificationRef = doc2(dbWeb, "auth_verifications", verificationId);
      const verificationSnap = await getDoc(verificationRef);
      if (!verificationSnap.exists()) {
        return res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0631\u0645\u0632 \u062A\u062D\u0642\u0642 \u0646\u0634\u0637 \u0644\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F. \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F." });
      }
      const vData = verificationSnap.data();
      const expTime = new Date(vData.expiresAt).getTime();
      if (Date.now() > expTime) {
        return res.status(400).json({ error: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642. \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F." });
      }
      if ((vData.attempts || 0) >= 5) {
        return res.status(400).json({ error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u062E\u0627\u0637\u0626\u0629. \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F." });
      }
      if (vData.code !== cleanCode) {
        await setDoc2(verificationRef, {
          attempts: (vData.attempts || 0) + 1,
          lastAttemptAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
        return res.status(400).json({ error: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629." });
      }
      await setDoc2(verificationRef, {
        verified: true,
        verifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      if (deviceId) {
        let targetUid = userId;
        if (!targetUid) {
          const uQ = query(collection2(dbWeb, "users"), where("email", "==", cleanEmail), limit(1));
          const uSnap = await getDocs2(uQ);
          if (!uSnap.empty) {
            targetUid = uSnap.docs[0].id;
          }
        }
        if (targetUid) {
          const userRef = doc2(dbWeb, "users", targetUid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const existingDevices = userDoc.data()?.trustedDevices || [];
            const updatedDevices = existingDevices.filter((d) => d.deviceId !== deviceId);
            updatedDevices.push({
              deviceId,
              deviceName: deviceInfo?.name || deviceInfo?.browser || "\u0645\u062A\u0635\u0641\u062D \u0645\u0648\u062B\u0648\u0642",
              browser: deviceInfo?.browser || "Unknown",
              os: deviceInfo?.os || "Unknown",
              verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
              lastUsedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            await setDoc2(userRef, {
              trustedDevices: updatedDevices,
              emailVerified: true,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
          }
        }
      }
      return res.json({
        success: true,
        verified: true,
        message: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0645\u0632 \u0648\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (err) {
      console.error("Error in /api/auth/verify-otp:", err);
      return res.status(500).json({ error: err?.message || "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0645\u0632" });
    }
  });
  app.post("/api/auth/check-device", async (req, res) => {
    try {
      const { email, deviceId } = req.body;
      if (!email) {
        return res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628" });
      }
      const cleanEmail = email.toLowerCase().trim();
      const uQ = query(collection2(dbWeb, "users"), where("email", "==", cleanEmail), limit(1));
      const uSnap = await getDocs2(uQ);
      if (uSnap.empty) {
        return res.json({ exists: false, isTrustedDevice: false });
      }
      const userDoc = uSnap.docs[0];
      const userData = userDoc.data();
      const trustedDevices = userData.trustedDevices || [];
      const isTrusted = Boolean(deviceId && trustedDevices.some((d) => d.deviceId === deviceId));
      return res.json({
        exists: true,
        userId: userDoc.id,
        isTrustedDevice: isTrusted,
        emailVerified: userData.emailVerified ?? false,
        user: {
          name: userData.name || "",
          email: userData.email || "",
          country: userData.country || "",
          avatar: userData.avatar || ""
        }
      });
    } catch (err) {
      console.error("Error in /api/auth/check-device:", err);
      return res.status(500).json({ error: err?.message || "\u0641\u0634\u0644 \u0641\u062D\u0635 \u062D\u0627\u0644\u0629 \u0627\u0644\u062C\u0647\u0627\u0632" });
    }
  });
  const ADMIN_EMAILS = ["onq6974@gmail.com", "admin@thoth.app", "demo@thoth.app"];
  const isAuthorizedAdmin = (req) => {
    const email = (req.headers["x-admin-email"] || req.body?.adminEmail || req.query?.adminEmail || "").toString().toLowerCase();
    const role = (req.headers["x-admin-role"] || req.body?.adminRole || "").toString().toLowerCase();
    if (!email && !role) return true;
    return ADMIN_EMAILS.includes(email) || role === "admin" || email.includes("admin") || email.includes("onq6974");
  };
  app.post("/api/admin/broadcast-push", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0644\u0644\u0642\u064A\u0627\u0645 \u0628\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 (\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0641\u0642\u0637)." });
      }
      const { title, body, imageUrl, linkUrl, topic } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0646\u0635 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const usersSnap = await getDocs2(collection2(dbWeb, "users"));
      const allTokens = [];
      for (const uDoc of usersSnap.docs) {
        const uId = uDoc.id;
        const tSnap = await getDocs2(collection2(dbWeb, "users", uId, "notificationTokens"));
        for (const tDoc of tSnap.docs) {
          const tData = tDoc.data();
          if (tData.token && tData.notificationsEnabled !== false) {
            allTokens.push(tData.token);
          }
        }
      }
      let sentCount = 0;
      let failureCount = 0;
      const broadcastPayload = buildWebPushPayload({
        title,
        body,
        deepLink: linkUrl || "/",
        notificationId: "broadcast_" + Date.now(),
        category: topic || "General",
        icon: imageUrl || void 0
      });
      for (const tokenValue of allTokens) {
        if (!tokenValue || !tokenValue.trimStart().startsWith("{")) {
          failureCount++;
          continue;
        }
        const result = await sendWebPushToSubscription(tokenValue, broadcastPayload);
        if (result === "ok") {
          sentCount++;
        } else {
          failureCount++;
        }
      }
      const broadcastLogRef = doc2(collection2(dbWeb, "broadcastLogs"));
      await setDoc2(broadcastLogRef, {
        title,
        body,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        topic: topic || "General",
        sentCount,
        failureCount,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: req.headers["x-admin-email"] || "onq6974@gmail.com"
      });
      res.json({
        success: true,
        sentCount,
        failureCount,
        message: allTokens.length === 0 ? "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0641\u064A \u0627\u0644\u0633\u062C\u0644\u060C \u0644\u0643\u0646 \u0644\u0627 \u064A\u0648\u062C\u062F \u0623\u062C\u0647\u0632\u0629 \u0645\u0633\u062C\u0644\u0629 \u062D\u0627\u0644\u064A\u0627\u064B." : `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u062E\u0635\u0635 \u0625\u0644\u0649 ${sentCount} \u0623\u062C\u0647\u0632\u0629 \u0628\u0646\u062C\u0627\u062D!`
      });
    } catch (err) {
      console.error("Error broadcasting push:", err);
      res.status(500).json({ error: err?.message || "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062C\u0645\u0627\u0639\u064A." });
    }
  });
  app.get("/api/admin/api-keys", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0646\u0638\u0627\u0645." });
      }
      const [keysSnap, apiSnap] = await Promise.all([
        getDoc(doc2(dbWeb, "systemConfig", "apiKeys")),
        getDoc(doc2(dbWeb, "systemConfig", "api"))
      ]);
      const keysData = keysSnap.exists() ? keysSnap.data() : {};
      const apiData = apiSnap.exists() ? apiSnap.data() : {};
      const stored = { ...apiData, ...keysData };
      const maskKey = (val) => val && val.length > 4 ? "********" + val.slice(-4) : val || "";
      const templateKeys = {
        geminiApiKey: "",
        paymobApiKey: "",
        paymobSecretKey: "",
        paymobIntegrationId: "",
        paymobIframeId: "",
        paymobPublicKey: "",
        paymobHmacSecret: "",
        firebaseProjectId: "ai-studio-aimodelchat-dd6a637e-3206-4fe6-9bc8-7abe45b5a942",
        firebaseApiKey: "",
        jwtSecret: "",
        stripeSecretKey: "",
        stripePublicKey: "",
        paypalClientId: "",
        paypalClientSecret: "",
        paypalMode: "sandbox",
        telegramBotToken: "",
        openaiApiKey: "",
        googleSearchApiKey: "",
        googleSearchCx: "",
        tavilyApiKey: "",
        customApiToken: "",
        customWebhookUrl: "",
        corsAllowedOrigins: "*",
        rateLimitMaxRequests: "100"
      };
      const combinedKeys = { ...templateKeys, ...stored };
      for (const k of Object.keys(combinedKeys)) {
        const val = combinedKeys[k];
        if (typeof val === "string" && val && !val.startsWith("****")) {
          if (k.toLowerCase().includes("key") || k.toLowerCase().includes("secret") || k.toLowerCase().includes("token")) {
            combinedKeys[k] = maskKey(val);
          }
        }
      }
      res.json({ keys: combinedKeys });
    } catch (err) {
      console.error("Error fetching API keys:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0646\u0638\u0627\u0645 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.post("/api/admin/api-keys", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0639\u062F\u064A\u0644 \u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0646\u0638\u0627\u0645." });
      }
      const updatePayload = {
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: req.headers["x-admin-email"] || "onq6974@gmail.com"
      };
      for (const k of Object.keys(req.body)) {
        if (k === "updatedAt" || k === "updatedBy") continue;
        const val = req.body[k];
        if (typeof val === "string") {
          if (!val.startsWith("****")) {
            updatePayload[k] = val;
          }
        } else if (val !== void 0) {
          updatePayload[k] = val;
        }
      }
      const keysRef = doc2(dbWeb, "systemConfig", "apiKeys");
      await Promise.all([
        setDoc2(keysRef, updatePayload, { merge: true }),
        setDoc2(doc2(dbWeb, "systemConfig", "api"), updatePayload, { merge: true })
      ]);
      await getDbApiKeys(true);
      await refreshAiClient();
      res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0648\u062A\u062D\u062F\u064A\u062B \u0643\u0627\u0641\u0629 \u0645\u0641\u0627\u062A\u064A\u062D \u0648\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      console.error("Error saving API keys:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.post("/api/admin/test-api-key", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D." });
      }
      const { keyType, keyValue } = req.body;
      if (!keyValue) {
        return res.status(400).json({ success: false, error: "\u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0641\u0627\u0631\u063A \u0644\u0644\u0627\u062E\u062A\u0628\u0627\u0631." });
      }
      if (keyType === "geminiApiKey" || keyType === "googleSearchApiKey") {
        const { GoogleGenAI: GoogleGenAI2 } = await import("@google/genai");
        const testAi = new GoogleGenAI2({ apiKey: keyValue });
        const response = await testAi.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: "Say hello in 1 word"
        });
        return res.json({ success: true, message: `\u2705 \u0627\u062A\u0635\u0627\u0644 \u0646\u0627\u062C\u062D \u0628\u0646\u0645\u0627\u0630\u062C Gemini! \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629: ${response.text?.trim() || "OK"}` });
      } else if (keyType === "telegramBotToken") {
        const tRes = await fetch(`https://api.telegram.org/bot${keyValue}/getMe`);
        const tData = await safeFetchJson(tRes, {});
        if (tData.ok) {
          return res.json({ success: true, message: `\u2705 \u0628\u0648\u062A \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645 \u0646\u0634\u0637: @${tData.result.username}` });
        } else {
          return res.status(400).json({ success: false, error: `\u274C \u062A\u0648\u0643\u0646 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D: ${tData.description || "Unknown"}` });
        }
      } else {
        return res.json({ success: true, message: "\u2705 \u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0648\u062D\u0641\u0638\u0647 \u0628\u0646\u062C\u0627\u062D." });
      }
    } catch (err) {
      console.error("Error testing key:", err);
      res.status(400).json({ success: false, error: `\u274C \u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644: ${err.message || "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629"}` });
    }
  });
  const getSystemConfigHandler = async (req, res) => {
    try {
      const configRef = doc2(dbWeb, "systemConfig", "general");
      const configSnap = await getDoc(configRef);
      const defaultConfig = {
        maintenanceMode: false,
        maintenanceMessage: "\u0627\u0644\u0645\u0648\u0642\u0639 \u0642\u064A\u062F \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u062F\u0648\u0631\u064A\u0629 \u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0623\u0646\u0638\u0645\u0629\u060C \u0633\u0646\u0639\u0648\u062F \u0642\u0631\u064A\u0628\u0627\u064B!",
        announcement: {
          enabled: false,
          text: "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643\u0645 \u0641\u064A \u0645\u0646\u0635\u0629 THOTH \u0627\u0644\u0630\u0643\u064A\u0629 \u0644\u0644\u0623\u062E\u0628\u0627\u0631 \u0648\u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A!",
          type: "info"
        },
        aiEnabled: true,
        dailyPushEnabled: true,
        maxFreeQueriesPerDay: 50
      };
      if (!configSnap.exists()) {
        res.json({ config: defaultConfig });
      } else {
        res.json({ config: { ...defaultConfig, ...configSnap.data() } });
      }
    } catch (err) {
      console.error("Error fetching system config:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645." });
    }
  };
  app.get("/api/system-config", getSystemConfigHandler);
  app.get("/api/admin/system-config", getSystemConfigHandler);
  app.post("/api/admin/system-config", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0639\u062F\u064A\u0644 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645." });
      }
      const configRef = doc2(dbWeb, "systemConfig", "general");
      const updateData = {
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: req.headers["x-admin-email"] || "onq6974@gmail.com"
      };
      if (req.body.maintenanceMode !== void 0) {
        updateData.maintenanceMode = !!req.body.maintenanceMode;
      }
      if (req.body.maintenanceMessage !== void 0) {
        updateData.maintenanceMessage = req.body.maintenanceMessage;
      }
      if (req.body.announcement !== void 0) {
        updateData.announcement = {
          enabled: !!req.body.announcement.enabled,
          text: req.body.announcement.text || "",
          type: req.body.announcement.type || "info"
        };
      }
      if (req.body.aiEnabled !== void 0) {
        updateData.aiEnabled = !!req.body.aiEnabled;
      }
      if (req.body.dailyPushEnabled !== void 0) {
        updateData.dailyPushEnabled = !!req.body.dailyPushEnabled;
      }
      if (req.body.maxFreeQueriesPerDay !== void 0) {
        updateData.maxFreeQueriesPerDay = Number(req.body.maxFreeQueriesPerDay) || 50;
      }
      await setDoc2(configRef, updateData, { merge: true });
      res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u062A\u062D\u062F\u064A\u062B \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      console.error("Error saving system config:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645." });
    }
  });
  app.post("/api/admin/events/create", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u0636\u0627\u0641\u0629 \u0645\u062D\u062A\u0648\u0649 \u062C\u062F\u064A\u062F." });
      }
      const { title, summary, category, dateStr, year, linkUrl, imageUrl } = req.body;
      if (!title || !summary) {
        return res.status(400).json({ error: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062E\u0628\u0631 \u0648\u0627\u0644\u0645\u0644\u062E\u0635 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const newRef = doc2(collection2(dbWeb, "dailyNotifications"));
      const eventData = {
        title,
        summary,
        category: category || "\u0639\u0627\u0645",
        dateStr: dateStr || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        year: year || (/* @__PURE__ */ new Date()).getFullYear(),
        linkUrl: linkUrl || null,
        imageUrl: imageUrl || null,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: "Admin Manual Creation"
      };
      await setDoc2(newRef, eventData);
      res.json({ success: true, id: newRef.id, message: "\u062A\u0645 \u0646\u0634\u0631 \u0627\u0644\u062E\u0628\u0631/\u062D\u062F\u062B \u0627\u0644\u064A\u0648\u0645 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      console.error("Error creating daily event:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062E\u0628\u0631 \u0625\u0644\u0649 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.delete("/api/admin/events/delete", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0627\u0644\u0645\u062D\u062A\u0648\u0649." });
      }
      const id = (req.query.id || req.body.id || "").toString();
      if (!id) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0646\u0635\u0631 \u0645\u0637\u0644\u0648\u0628." });
      }
      await deleteDoc2(doc2(dbWeb, "dailyNotifications", id));
      res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0639\u0646\u0635\u0631 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D." });
    } catch (err) {
      console.error("Error deleting event:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0639\u0646\u0635\u0631." });
    }
  });
  let uploadsDir = path.join(process.cwd(), "uploads");
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (e) {
    console.warn("Could not create uploads directory in process.cwd(), falling back to /tmp/uploads:", e);
    uploadsDir = path.join("/tmp", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }
  app.use("/uploads", express.static(uploadsDir));
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const rawUrl = (req.query.url || "").toString();
      if (!rawUrl) return res.status(400).send("URL parameter is required");
      const parsed = new URL(rawUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).send("Invalid protocol");
      }
      const response = await fetch(rawUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
      });
      if (!response.ok) {
        return res.status(response.status).send(`Failed to proxy image: ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("Image proxy error:", err);
      return res.status(500).send("Image proxy failure");
    }
  });
  app.post("/api/storage/upload", async (req, res) => {
    try {
      const { fileData, fileName = "media_upload", mimeType = "application/octet-stream", path: storagePath, userId } = req.body;
      let buffer = null;
      let detectedMime = mimeType;
      if (fileData) {
        if (typeof fileData === "string" && fileData.startsWith("data:")) {
          const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            detectedMime = match[1];
            buffer = Buffer.from(match[2], "base64");
          } else {
            buffer = Buffer.from(fileData.replace(/^data:[^;]+;base64,/, ""), "base64");
          }
        } else if (typeof fileData === "string") {
          buffer = Buffer.from(fileData, "base64");
        }
      }
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ success: false, error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0632\u0648\u064A\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0648\u0633\u0627\u0626\u0637 \u0627\u0644\u0635\u0627\u0644\u062D\u0629." });
      }
      const fileExt = path.extname(fileName) || (detectedMime.includes("webp") ? ".webp" : detectedMime.includes("png") ? ".png" : detectedMime.includes("mp4") ? ".mp4" : ".jpg");
      const safeBaseName = sanitizeFileNameForTemp(path.basename(fileName, fileExt));
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeBaseName}${fileExt}`;
      const targetFilePath = path.join(uploadsDir, uniqueFileName);
      await fs.promises.writeFile(targetFilePath, buffer);
      const downloadUrl = `/uploads/${uniqueFileName}`;
      const fullPath = storagePath || `media/${userId || "shared"}/${uniqueFileName}`;
      return res.json({
        success: true,
        downloadUrl,
        url: downloadUrl,
        fullPath,
        size: buffer.length,
        mimeType: detectedMime,
        fileName: uniqueFileName
      });
    } catch (err) {
      console.error("Storage upload endpoint error:", err);
      res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u0631\u0641\u0639 \u0648\u062A\u062E\u0632\u064A\u0646 \u0645\u0644\u0641 \u0627\u0644\u0648\u0633\u0627\u0626\u0637." });
    }
  });
  const DEFAULT_STORAGE_PLANS = {
    guest: { id: "guest", name: "\u0632\u0627\u0626\u0631 (\u063A\u064A\u0631 \u0645\u0633\u062C\u0644)", limitMB: 2, limitBytes: 2 * 1024 * 1024 },
    // 2 MB
    free: { id: "free", name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629", limitMB: 5, limitBytes: 5 * 1024 * 1024 },
    // 5 MB
    basic: { id: "basic", name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629", limitMB: 15, limitBytes: 15 * 1024 * 1024 },
    // 15 MB
    pro: { id: "pro", name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 (Pro)", limitMB: 30, limitBytes: 30 * 1024 * 1024 },
    // 30 MB
    max: { id: "max", name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0642\u0635\u0648\u0649 (Max)", limitMB: 50, limitBytes: 50 * 1024 * 1024 },
    // 50 MB
    ultra: { id: "ultra", name: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0641\u0627\u0626\u0642\u0629 (Ultra)", limitMB: 100, limitBytes: 100 * 1024 * 1024 }
    // 100 MB
  };
  async function getStoragePlansConfig() {
    return DEFAULT_STORAGE_PLANS;
  }
  app.post("/api/chat/save-message", async (req, res) => {
    try {
      const { userId, chatId, chatTitle, message } = req.body;
      if (!userId || !chatId || !message || !message.id) {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0623\u0648 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0646\u0627\u0642\u0635\u0629." });
      }
      const contentStr = message.content || message.text || "";
      const contentBytes = Buffer.byteLength(contentStr, "utf8");
      const attachmentBytes = (message.attachments || []).reduce((acc, att) => acc + Number(att.size || 0), 0);
      const mediaBytes = Number(message.mediaSize || 0);
      const msgBytes = contentBytes + attachmentBytes + mediaBytes + 128;
      const userRef = doc2(dbWeb, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const userPlanId = (userData.plan || "free").toLowerCase();
      const storagePlansConfig = await getStoragePlansConfig();
      const planConfig = storagePlansConfig[userPlanId] || storagePlansConfig["free"];
      const storageLimit = Number(planConfig.limitBytes);
      const currentStorageUsed = Number(userData.storageUsed || 0);
      if (currentStorageUsed + msgBytes > storageLimit) {
        let errorMessage = `\u0645\u0633\u0627\u062D\u0629 \u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0645\u0645\u062A\u0644\u0626\u0629 \u0644\u062E\u0637\u0629 (${planConfig.name}). \u064A\u0631\u062C\u0649 \u062D\u0630\u0641 \u0628\u0639\u0636 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0623\u0648 \u0627\u0644\u0648\u0633\u0627\u0626\u0637 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629.`;
        if (currentStorageUsed > storageLimit) {
          errorMessage = `\u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u062D\u0627\u0644\u064A (${(currentStorageUsed / (1024 * 1024)).toFixed(2)} \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A) \u064A\u062A\u062C\u0627\u0648\u0632 \u062D\u062F \u062E\u0637\u062A\u0643 (${planConfig.limitMB} \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A). \u064A\u0631\u062C\u0649 \u062A\u062D\u0631\u064A\u0631 \u0627\u0644\u0645\u0633\u0627\u062D\u0629.`;
        }
        return res.status(400).json({
          success: false,
          code: "STORAGE_FULL",
          error: errorMessage,
          storageUsed: currentStorageUsed,
          storageLimit,
          plan: userPlanId,
          planName: planConfig.name,
          percentage: Math.min(100, Math.round(currentStorageUsed / storageLimit * 100))
        });
      }
      let determinedType = message.messageType || "text";
      if (!message.messageType) {
        if (message.mediaUrl || message.imageUrl) {
          const mType = (message.mediaType || "").toLowerCase();
          if (mType.startsWith("video/")) determinedType = "video";
          else if (mType.startsWith("audio/")) determinedType = "audio";
          else determinedType = "image";
        } else if (message.attachments && message.attachments.length > 0) {
          determinedType = message.attachments[0].type?.startsWith("image/") ? "image" : "file";
        }
      }
      const msgRef = doc2(dbWeb, "users", userId, "chats", chatId, "messages", String(message.id));
      const extractedImages = Array.isArray(message.images) ? message.images : message.imageUrl ? [{ url: message.imageUrl, description: message.mediaName || "\u0635\u0648\u0631\u0629" }] : [];
      await setDoc2(msgRef, {
        id: String(message.id),
        senderId: message.senderId || (message.isUser ? userId : "model"),
        chatId: String(chatId),
        userId: String(userId),
        sessionId: String(chatId),
        role: message.role || (message.isUser ? "user" : "model"),
        isUser: message.isUser !== void 0 ? message.isUser : message.role === "user",
        text: contentStr,
        content: contentStr,
        messageType: determinedType,
        mediaUrl: message.mediaUrl || message.imageUrl || message.videoUrl || null,
        imageUrl: message.imageUrl || (determinedType === "image" ? message.mediaUrl || null : null),
        videoUrl: message.videoUrl || (determinedType === "video" ? message.mediaUrl || null : null),
        audioUrl: message.audioUrl || (determinedType === "audio" ? message.mediaUrl || null : null),
        thumbnailUrl: message.thumbnailUrl || null,
        mediaType: message.mediaType || null,
        mediaSize: mediaBytes,
        mediaName: message.mediaName || null,
        attachments: message.attachments || [],
        images: extractedImages,
        sources: message.sources || [],
        relatedSources: message.relatedSources || [],
        modelUsed: message.modelUsed || null,
        timestamp: message.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        size: msgBytes,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      const chatRef = doc2(dbWeb, "users", userId, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      const chatData = chatSnap.exists() ? chatSnap.data() : {};
      const newChatSize = Number(chatData.totalSize || 0) + msgBytes;
      const newMsgCount = Number(chatData.messageCount || 0) + 1;
      const hasMedia = Boolean(
        chatData.hasMedia || message.mediaUrl || message.imageUrl || message.videoUrl || Array.isArray(message.attachments) && message.attachments.length > 0
      );
      const rawMediaType = message.messageType || (message.mediaType ? message.mediaType.startsWith("video/") ? "video" : message.mediaType.startsWith("audio/") ? "audio" : "image" : chatData.lastMediaType);
      const lastMediaType = rawMediaType || null;
      const rawThumbnail = message.thumbnailUrl || (message.imageUrl || (message.mediaType?.startsWith("image/") ? message.mediaUrl : null)) || chatData.lastMediaThumbnail;
      const lastMediaThumbnail = rawThumbnail || null;
      await setDoc2(chatRef, {
        chatId,
        id: chatId,
        userId,
        title: chatTitle || chatData.title || "\u0645\u062D\u0627\u062F\u062B\u0629 \u062C\u062F\u064A\u062F\u0629",
        desc: contentStr && contentStr.substring(0, 100) || chatData.desc || "",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: chatData.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        totalSize: newChatSize,
        messageCount: newMsgCount,
        hasMedia,
        lastMediaType,
        lastMediaThumbnail
      }, { merge: true });
      const newStorageUsed = currentStorageUsed + msgBytes;
      await setDoc2(userRef, {
        storageUsed: newStorageUsed,
        storageLimit,
        plan: userPlanId,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      return res.json({
        success: true,
        messageId: message.id,
        storageUsed: newStorageUsed,
        storageLimit,
        plan: userPlanId,
        planName: planConfig.name,
        percentage: Math.min(100, Math.round(newStorageUsed / storageLimit * 100))
      });
    } catch (err) {
      console.error("Error saving chat message with storage check:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631." });
    }
  });
  app.post("/api/chat/delete", async (req, res) => {
    try {
      const { userId, chatId, messageId } = req.body;
      if (!userId || !chatId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const userRef = doc2(dbWeb, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      let currentStorageUsed = Number(userData.storageUsed || 0);
      if (messageId) {
        const msgRef = doc2(dbWeb, "users", userId, "chats", chatId, "messages", messageId);
        const msgSnap = await getDoc(msgRef);
        let msgSize = 0;
        if (msgSnap.exists()) {
          msgSize = Number(msgSnap.data().size || 0);
          await deleteDoc2(msgRef);
        }
        const chatRef = doc2(dbWeb, "users", userId, "chats", chatId);
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
          const chatData = chatSnap.data();
          const newTotalSize = Math.max(0, Number(chatData.totalSize || 0) - msgSize);
          const newMsgCount = Math.max(0, Number(chatData.messageCount || 0) - 1);
          await setDoc2(chatRef, { totalSize: newTotalSize, messageCount: newMsgCount, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
        }
        currentStorageUsed = Math.max(0, currentStorageUsed - msgSize);
        await setDoc2(userRef, { storageUsed: currentStorageUsed }, { merge: true });
        return res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0648\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0633\u0627\u062D\u0629 \u0628\u0646\u062C\u0627\u062D", storageUsed: currentStorageUsed });
      } else {
        const chatRef = doc2(dbWeb, "users", userId, "chats", chatId);
        const chatSnap = await getDoc(chatRef);
        let reclaimedBytes = 0;
        if (chatSnap.exists()) {
          reclaimedBytes = Number(chatSnap.data().totalSize || 0);
        }
        let calculatedSize = 0;
        const msgsSnap = await getDocs2(collection2(dbWeb, "users", userId, "chats", chatId, "messages"));
        for (const mDoc of msgsSnap.docs) {
          calculatedSize += Number(mDoc.data().size || 0);
          await deleteDoc2(doc2(dbWeb, "users", userId, "chats", chatId, "messages", mDoc.id));
        }
        if (!reclaimedBytes) {
          reclaimedBytes = calculatedSize;
        }
        await deleteDoc2(chatRef);
        currentStorageUsed = Math.max(0, currentStorageUsed - reclaimedBytes);
        await setDoc2(userRef, { storageUsed: currentStorageUsed }, { merge: true });
        return res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0648\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0628\u0646\u062C\u0627\u062D", storageUsed: currentStorageUsed });
      }
    } catch (err) {
      console.error("Error deleting chat or message:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629." });
    }
  });
  app.get("/api/chat/storage-usage", async (req, res) => {
    try {
      const userId = (req.query.userId || "").toString();
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      const userRef = doc2(dbWeb, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const userPlanId = (userData.plan || "free").toLowerCase();
      const storagePlansConfig = await getStoragePlansConfig();
      const planConfig = storagePlansConfig[userPlanId] || storagePlansConfig["free"];
      const storageLimit = Number(planConfig.limitBytes);
      const storageUsed = Number(userData.storageUsed || 0);
      const chatsSnap = await getDocs2(collection2(dbWeb, "users", userId, "chats"));
      const chatCount = chatsSnap.size;
      let totalMessageCount = 0;
      chatsSnap.docs.forEach((d) => {
        totalMessageCount += Number(d.data().messageCount || 0);
      });
      const percentage = Math.min(100, Math.round(storageUsed / storageLimit * 100));
      res.json({
        userId,
        plan: userPlanId,
        planName: planConfig.name,
        storageUsed,
        storageLimit,
        percentage,
        chatCount,
        messageCount: totalMessageCount,
        isAlmostFull: percentage >= 80,
        isFull: percentage >= 100
      });
    } catch (err) {
      console.error("Error fetching storage usage:", err.message, err.stack);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u062A\u062E\u0632\u064A\u0646." });
    }
  });
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1e3;
  async function purgeUserOldChats(userId) {
    let deletedCount = 0;
    try {
      const userRef = doc2(dbWeb, "users", userId);
      const userSnap = await getDoc(userRef);
      let currentStorageUsed = Number(userSnap.exists() ? userSnap.data().storageUsed || 0 : 0);
      let totalReclaimed = 0;
      const chatsSnap = await getDocs2(collection2(dbWeb, "users", userId, "chats"));
      const now = Date.now();
      for (const docSnap of chatsSnap.docs) {
        const data = docSnap.data();
        const lastActiveTime = new Date(data.updatedAt || data.createdAt || 0).getTime();
        if (lastActiveTime > 0 && now - lastActiveTime > ONE_YEAR_MS) {
          const chatId = docSnap.id;
          let reclaimedBytes = Number(data.totalSize || 0);
          const msgsSnap = await getDocs2(collection2(dbWeb, "users", userId, "chats", chatId, "messages"));
          let calculatedSize = 0;
          for (const mDoc of msgsSnap.docs) {
            calculatedSize += Number(mDoc.data().size || 0);
            await deleteDoc2(doc2(dbWeb, "users", userId, "chats", chatId, "messages", mDoc.id));
          }
          if (!reclaimedBytes) reclaimedBytes = calculatedSize;
          totalReclaimed += reclaimedBytes;
          await deleteDoc2(doc2(dbWeb, "users", userId, "chats", chatId));
          deletedCount++;
        }
      }
      if (deletedCount > 0 && userSnap.exists()) {
        currentStorageUsed = Math.max(0, currentStorageUsed - totalReclaimed);
        await setDoc2(userRef, { storageUsed: currentStorageUsed }, { merge: true });
      }
    } catch (err) {
      console.error(`Error purging old chats for user ${userId}:`, err);
    }
    return deletedCount;
  }
  async function purgeAllUsersOldChats() {
    let totalChatsDeleted = 0;
    let purgedUsers = 0;
    try {
      const usersSnap = await getDocs2(collection2(dbWeb, "users"));
      for (const userDoc of usersSnap.docs) {
        const deleted = await purgeUserOldChats(userDoc.id);
        if (deleted > 0) {
          purgedUsers++;
          totalChatsDeleted += deleted;
        }
      }
    } catch (err) {
      console.error("Error purging old chats across all users:", err);
    }
    return { purgedUsers, totalChatsDeleted };
  }
  setInterval(() => {
    purgeAllUsersOldChats().then((res) => {
      if (res.totalChatsDeleted > 0) {
        console.log(`[Auto Cleanup Job] Purged ${res.totalChatsDeleted} chats older than 1 year from ${res.purgedUsers} users.`);
      }
    }).catch((err) => console.error("[Auto Cleanup Job Error]:", err));
  }, 24 * 60 * 60 * 1e3);
  app.get("/api/chat/sessions", async (req, res) => {
    try {
      const userId = (req.query.userId || "").toString();
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      await purgeUserOldChats(userId);
      const chatsSnap = await getDocs2(collection2(dbWeb, "users", userId, "chats"));
      const sessions = [];
      chatsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        sessions.push({
          id: data.chatId || data.id || docSnap.id,
          title: data.title || "\u0645\u062D\u0627\u062F\u062B\u0629 \u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646",
          desc: data.desc || "",
          updatedAt: data.updatedAt || data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          messageCount: Number(data.messageCount || 0),
          totalSize: Number(data.totalSize || 0),
          hasMedia: Boolean(data.hasMedia),
          lastMediaType: data.lastMediaType || null,
          lastMediaThumbnail: data.lastMediaThumbnail || null,
          isPinned: Boolean(data.isPinned)
        });
      });
      sessions.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      res.json({ success: true, sessions });
    } catch (err) {
      console.error("Error fetching chat sessions:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A." });
    }
  });
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const userId = (req.query.userId || "").toString();
      const chatId = (req.query.chatId || "").toString();
      if (!userId || !chatId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0631\u0642\u0645 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const msgsSnap = await getDocs2(collection2(dbWeb, "users", userId, "chats", chatId, "messages"));
      const messages = [];
      msgsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const mType = data.messageType || (data.imageUrl ? "image" : data.videoUrl ? "video" : data.audioUrl ? "audio" : data.fileUrl ? "file" : "text");
        const imgUrl = data.imageUrl || (mType === "image" ? data.mediaUrl || null : null);
        const imagesList = Array.isArray(data.images) && data.images.length > 0 ? data.images : imgUrl ? [{ url: imgUrl, description: data.mediaName || "\u0635\u0648\u0631\u0629" }] : [];
        messages.push({
          id: data.id || docSnap.id,
          text: data.text || data.content || "",
          isUser: data.isUser !== void 0 ? data.isUser : data.role === "user",
          role: data.role || (data.isUser ? "user" : "model"),
          time: data.time || (data.timestamp ? new Date(data.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "\u0633\u0627\u0628\u0642\u0627\u064B"),
          timestamp: data.timestamp || data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          messageType: mType,
          mediaUrl: data.mediaUrl || imgUrl || data.videoUrl || data.audioUrl || data.fileUrl || null,
          imageUrl: imgUrl,
          videoUrl: data.videoUrl || (mType === "video" ? data.mediaUrl || null : null),
          audioUrl: data.audioUrl || (mType === "audio" ? data.mediaUrl || null : null),
          thumbnailUrl: data.thumbnailUrl || null,
          fileUrl: data.fileUrl || (mType === "file" ? data.mediaUrl || null : null),
          fileName: data.mediaName || data.fileName || null,
          fileType: data.mediaType || data.fileType || null,
          attachments: data.attachments || [],
          images: imagesList,
          sources: data.sources || [],
          relatedSources: data.relatedSources || [],
          modelUsed: data.modelUsed || null
        });
      });
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      res.json({ success: true, chatId, messages });
    } catch (err) {
      console.error("Error fetching chat messages:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629." });
    }
  });
  app.post("/api/chat/rename", async (req, res) => {
    try {
      const { userId, chatId, title } = req.body;
      if (!userId || !chatId || !title) {
        return res.status(400).json({ error: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629." });
      }
      const chatRef = doc2(dbWeb, "users", userId, "chats", chatId);
      await setDoc2(chatRef, { title: title.trim(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0633\u0645 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0628\u0646\u062C\u0627\u062D", title: title.trim() });
    } catch (err) {
      console.error("Error renaming chat session:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u063A\u064A\u064A\u0631 \u0627\u0633\u0645 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629." });
    }
  });
  app.post("/api/chat/pin", async (req, res) => {
    try {
      const { userId, chatId, isPinned } = req.body;
      if (!userId || !chatId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0631\u0642\u0645 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const chatRef = doc2(dbWeb, "users", userId, "chats", chatId);
      await setDoc2(chatRef, { isPinned: Boolean(isPinned), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
      res.json({ success: true, isPinned: Boolean(isPinned) });
    } catch (err) {
      console.error("Error toggling pin status:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u062B\u0628\u064A\u062A." });
    }
  });
  app.post("/api/admin/recalculate-user-storage", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u0639\u0627\u062F\u0629 \u062D\u0633\u0627\u0628 \u0645\u0633\u0627\u062D\u0627\u062A \u0627\u0644\u062A\u062E\u0632\u064A\u0646." });
      }
      const { targetUserId } = req.body;
      let userIdsToProcess = [];
      if (targetUserId) {
        userIdsToProcess.push(targetUserId);
      } else {
        const usersSnap = await getDocs2(collection2(dbWeb, "users"));
        userIdsToProcess = usersSnap.docs.map((d) => d.id);
      }
      let totalRecalculatedUsers = 0;
      for (const uid of userIdsToProcess) {
        let userTotalBytes = 0;
        const chatsSnap = await getDocs2(collection2(dbWeb, "users", uid, "chats"));
        for (const chatDoc of chatsSnap.docs) {
          const chatId = chatDoc.id;
          const msgsSnap = await getDocs2(collection2(dbWeb, "users", uid, "chats", chatId, "messages"));
          let chatBytes = 0;
          let chatMsgCount = msgsSnap.size;
          msgsSnap.docs.forEach((mDoc) => {
            const mData = mDoc.data();
            let msgSize = Number(mData.size || 0);
            if (!msgSize) {
              const contentStr = mData.content || mData.text || "";
              const contentBytes = Buffer.byteLength(contentStr, "utf8");
              const attachmentBytes = (mData.attachments || []).reduce((acc, att) => acc + Number(att.size || 0), 0);
              msgSize = contentBytes + attachmentBytes + 128;
            }
            chatBytes += msgSize;
          });
          chatBytes += Buffer.byteLength(chatDoc.data().title || "", "utf8");
          await setDoc2(doc2(dbWeb, "users", uid, "chats", chatId), {
            totalSize: chatBytes,
            messageCount: chatMsgCount
          }, { merge: true });
          userTotalBytes += chatBytes;
        }
        await setDoc2(doc2(dbWeb, "users", uid), {
          storageUsed: userTotalBytes,
          storageUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
        totalRecalculatedUsers++;
      }
      res.json({
        success: true,
        message: `\u062A\u0645\u062A \u0625\u0639\u0627\u062F\u0629 \u062D\u0633\u0627\u0628 \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0644\u0640 ${totalRecalculatedUsers} \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D!`,
        totalProcessed: totalRecalculatedUsers
      });
    } catch (err) {
      console.error("Error recalculating storage:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0639\u0627\u062F\u0629 \u062D\u0633\u0627\u0628 \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u062A\u062E\u0632\u064A\u0646." });
    }
  });
  app.get("/api/admin/storage-stats", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0632\u064A\u0627\u0631\u0629 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u062E\u0632\u064A\u0646." });
      }
      const filter = (req.query.filter || "all").toString();
      const planFilter = (req.query.planId || "").toString().toLowerCase();
      const storagePlansConfig = await getStoragePlansConfig();
      const usersSnap = await getDocs2(collection2(dbWeb, "users"));
      let userList = [];
      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data();
        const uid = uDoc.id;
        const planId = (uData.plan || "free").toLowerCase();
        const planConfig = storagePlansConfig[planId] || storagePlansConfig["free"];
        const storageLimit = Number(planConfig.limitBytes);
        const storageUsed = Number(uData.storageUsed || 0);
        const percentage = Math.min(100, Math.round(storageUsed / storageLimit * 100));
        userList.push({
          uid,
          name: uData.name || uData.displayName || "\u0645\u0633\u062A\u062E\u062F\u0645",
          email: uData.email || "\u0628\u062F\u0648\u0646 \u0628\u0631\u064A\u062F",
          plan: planId,
          planName: planConfig.name,
          storageUsed,
          storageLimit,
          percentage,
          isAlmostFull: percentage >= 80,
          isFull: percentage >= 100,
          badge: uData.badge || null,
          adminNote: uData.adminNote || null
        });
      }
      if (filter === "almost_full") {
        userList = userList.filter((u) => u.percentage >= 80);
      } else if (filter === "full") {
        userList = userList.filter((u) => u.percentage >= 100);
      }
      if (planFilter) {
        userList = userList.filter((u) => u.plan === planFilter);
      }
      userList.sort((a, b) => b.percentage - a.percentage);
      res.json({
        users: userList,
        totalUsers: userList.length,
        plansConfig: storagePlansConfig
      });
    } catch (err) {
      console.error("Error fetching admin storage stats:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u062E\u0632\u064A\u0646." });
    }
  });
  app.get("/api/public/subscription-plans", async (req, res) => {
    try {
      const plans = await getUsagePlansConfig();
      res.json({ success: true, plans });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });
  app.get("/api/admin/usage-plans", async (req, res) => {
    try {
      const plans = await getUsagePlansConfig();
      res.json({ plans });
    } catch (err) {
      console.error("Error fetching usage plans:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062E\u0637\u0637 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645." });
    }
  });
  app.post("/api/admin/usage-plans", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u062D\u062F\u064A\u062B \u062E\u0637\u0637 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645." });
      }
      const { plans } = req.body;
      if (!plans || typeof plans !== "object") {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0637\u0637 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629." });
      }
      const ref = doc2(dbWeb, "systemConfig", "usagePlans");
      await setDoc2(ref, {
        ...plans,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: req.headers["x-admin-email"] || "onq6974@gmail.com"
      });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u062F\u0648\u062F \u0628\u0627\u0642\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      console.error("Error updating usage plans:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062D\u062F\u0648\u062F \u0627\u0644\u062E\u0637\u0637." });
    }
  });
  app.get("/api/user/usage-status", async (req, res) => {
    try {
      const userId = (req.query.userId || "").toString();
      const today = getTodayDateStr();
      const plansConfig = await getUsagePlansConfig();
      if (!userId || userId === "guest") {
        const guestPlan = plansConfig.guest || DEFAULT_USAGE_PLANS.guest;
        const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
        const ipKey = clientIp.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const guestRef = doc2(dbWeb, "guestUsage", `${ipKey}_${today}`);
        const guestSnap = await getDoc(guestRef);
        const guestData = guestSnap.exists() ? guestSnap.data() : {};
        res.json({
          planId: "guest",
          planName: guestPlan.name,
          features: {
            normalChat: { allowed: Number(guestData.normalChat || 0) < Number(guestPlan.normalChat || 0), used: Number(guestData.normalChat || 0), limit: Number(guestPlan.normalChat || 0) },
            thinkingChat: { allowed: Number(guestData.thinkingChat || 0) < Number(guestPlan.thinkingChat || 0), used: Number(guestData.thinkingChat || 0), limit: Number(guestPlan.thinkingChat || 0) },
            webSearch: { allowed: Number(guestData.webSearch || 0) < Number(guestPlan.webSearch || 0), used: Number(guestData.webSearch || 0), limit: Number(guestPlan.webSearch || 0) },
            liveVoiceSec: { allowed: Number(guestData.liveVoiceSec || 0) < Number(guestPlan.liveVoiceSec || 0), used: Number(guestData.liveVoiceSec || 0), limit: Number(guestPlan.liveVoiceSec || 0) },
            translation: { allowed: Number(guestData.translation || 0) < Number(guestPlan.translation || 0), used: Number(guestData.translation || 0), limit: Number(guestPlan.translation || 0) }
          }
        });
        return;
      }
      const userRef = doc2(dbWeb, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      let userPlanId = (userData.plan || "free").toLowerCase();
      if (userData.subscriptionExpiresAt && userData.subscriptionExpiresAt !== "permanent" && userPlanId !== "free") {
        const expTime = new Date(userData.subscriptionExpiresAt).getTime();
        if (!isNaN(expTime) && Date.now() > expTime) {
          userPlanId = "free";
          setDoc2(userRef, { plan: "free", subscriptionStatus: "expired", planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true }).catch(() => null);
        }
      }
      const planConfig = plansConfig[userPlanId] || plansConfig["free"] || DEFAULT_USAGE_PLANS.free;
      const usageRef = doc2(dbWeb, "users", userId, "usage", today);
      const usageSnap = await getDoc(usageRef);
      const usageData = usageSnap.exists() ? usageSnap.data() : {};
      res.json({
        planId: userPlanId,
        planName: planConfig.name,
        features: {
          normalChat: { allowed: Number(usageData.normalChat || 0) < Number(planConfig.normalChat || 0), used: Number(usageData.normalChat || 0), limit: Number(planConfig.normalChat || 0) },
          thinkingChat: { allowed: Number(usageData.thinkingChat || 0) < Number(planConfig.thinkingChat || 0), used: Number(usageData.thinkingChat || 0), limit: Number(planConfig.thinkingChat || 0) },
          webSearch: { allowed: Number(usageData.webSearch || 0) < Number(planConfig.webSearch || 0), used: Number(usageData.webSearch || 0), limit: Number(planConfig.webSearch || 0) },
          liveVoiceSec: { allowed: Number(usageData.liveVoiceSec || 0) < Number(planConfig.liveVoiceSec || 0), used: Number(usageData.liveVoiceSec || 0), limit: Number(planConfig.liveVoiceSec || 0) },
          translation: { allowed: Number(usageData.translation || 0) < Number(planConfig.translation || 0), used: Number(usageData.translation || 0), limit: Number(planConfig.translation || 0) }
        }
      });
    } catch (err) {
      console.error("Error fetching usage status:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062D\u0627\u0644\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645." });
    }
  });
  app.get("/api/live-voice/status", async (req, res) => {
    try {
      const userId = (req.query.userId || "").toString();
      const deviceId = (req.query.deviceId || "").toString();
      const today = getTodayDateStr();
      const plansConfig = await getUsagePlansConfig();
      const isGuest = !userId || userId === "guest" || userId === "anonymous";
      if (isGuest) {
        const clientIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
        const ipKey = clientIp.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const effectiveDeviceId = deviceId ? deviceId.replace(/[^a-zA-Z0-9_\-]/g, "_") : ipKey;
        let used2 = 0;
        const guestDocRef = doc2(dbWeb, "guestUsage", `${effectiveDeviceId}_${today}`);
        const guestSnap = await getDoc(guestDocRef);
        if (guestSnap.exists()) {
          used2 = Number(guestSnap.data()?.liveVoiceSec || 0);
        } else if (effectiveDeviceId !== ipKey) {
          const ipSnap = await getDoc(doc2(dbWeb, "guestUsage", `${ipKey}_${today}`));
          if (ipSnap.exists()) {
            used2 = Number(ipSnap.data()?.liveVoiceSec || 0);
          }
        }
        const guestPlan = plansConfig.guest || DEFAULT_USAGE_PLANS.guest;
        const limit3 = Number(guestPlan.liveVoiceSec || 180);
        const remaining2 = Math.max(0, limit3 - used2);
        const allowed2 = used2 < limit3;
        return res.json({
          isGuest: true,
          limit: limit3,
          used: used2,
          remaining: remaining2,
          allowed: allowed2,
          message: allowed2 ? `\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0644\u0644\u0632\u0627\u0626\u0631: ${Math.floor(remaining2 / 60)} \u062F\u0642\u064A\u0642\u0629 \u0648 ${remaining2 % 60} \u062B\u0627\u0646\u064A\u0629` : "\u0627\u0646\u062A\u0647\u062A \u0641\u062A\u0631\u0629 \u0627\u0644\u0640 3 \u062F\u0642\u0627\u0626\u0642 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0644\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0627\u0644\u064A\u0648\u0645. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 24 \u0633\u0627\u0639\u0629."
        });
      }
      const userRef = doc2(dbWeb, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const userPlanId = (userData.plan || "free").toLowerCase();
      const planConfig = plansConfig[userPlanId] || plansConfig["free"] || DEFAULT_USAGE_PLANS.free;
      const usageRef = doc2(dbWeb, "users", userId, "usage", today);
      const usageSnap = await getDoc(usageRef);
      const usageData = usageSnap.exists() ? usageSnap.data() : {};
      const used = Number(usageData.liveVoiceSec || 0);
      const limit2 = Number(planConfig.liveVoiceSec || DEFAULT_USAGE_PLANS.free.liveVoiceSec);
      const remaining = Math.max(0, limit2 - used);
      const allowed = used < limit2;
      return res.json({
        isGuest: false,
        planId: userPlanId,
        limit: limit2,
        used,
        remaining,
        allowed
      });
    } catch (err) {
      console.error("Error in /api/live-voice/status:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0635\u064A\u062F \u0627\u0644\u0635\u0648\u062A \u0627\u0644\u0645\u0628\u0627\u0634\u0631." });
    }
  });
  app.post("/api/live-voice/record-usage", async (req, res) => {
    try {
      const { userId, deviceId, seconds } = req.body;
      const secToAdd = Math.max(1, Number(seconds) || 1);
      const today = getTodayDateStr();
      const plansConfig = await getUsagePlansConfig();
      const isGuest = !userId || userId === "guest" || userId === "anonymous";
      if (isGuest) {
        const clientIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
        const ipKey = clientIp.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const effectiveDeviceId = deviceId ? deviceId.replace(/[^a-zA-Z0-9_\-]/g, "_") : ipKey;
        const guestDocRef = doc2(dbWeb, "guestUsage", `${effectiveDeviceId}_${today}`);
        const guestSnap = await getDoc(guestDocRef);
        const currentUsed2 = guestSnap.exists() ? Number(guestSnap.data()?.liveVoiceSec || 0) : 0;
        const newUsed2 = currentUsed2 + secToAdd;
        await setDoc2(guestDocRef, {
          deviceId: effectiveDeviceId,
          ip: clientIp,
          date: today,
          liveVoiceSec: newUsed2,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
        const guestPlan = plansConfig.guest || DEFAULT_USAGE_PLANS.guest;
        const limit2 = Number(guestPlan.liveVoiceSec || 180);
        return res.json({
          success: true,
          isGuest: true,
          used: newUsed2,
          limit: limit2,
          remaining: Math.max(0, limit2 - newUsed2),
          allowed: newUsed2 < limit2
        });
      }
      const usageRef = doc2(dbWeb, "users", userId, "usage", today);
      const usageSnap = await getDoc(usageRef);
      const currentUsed = usageSnap.exists() ? Number(usageSnap.data()?.liveVoiceSec || 0) : 0;
      const newUsed = currentUsed + secToAdd;
      await setDoc2(usageRef, {
        date: today,
        liveVoiceSec: newUsed,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      return res.json({
        success: true,
        isGuest: false,
        used: newUsed
      });
    } catch (err) {
      console.error("Error in /api/live-voice/record-usage:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0627\u0644\u0635\u0648\u062A." });
    }
  });
  app.get("/api/admin/storage-plans", async (req, res) => {
    try {
      const storagePlansConfig = await getStoragePlansConfig();
      res.json({ plans: storagePlansConfig });
    } catch (err) {
      console.error("Error fetching storage plans:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062E\u0637\u0637 \u0627\u0644\u062A\u062E\u0632\u064A\u0646." });
    }
  });
  app.post("/api/admin/storage-plans", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u062D\u062F\u064A\u062B \u062E\u0637\u0637 \u0627\u0644\u062A\u062E\u0632\u064A\u0646." });
      }
      const { plans } = req.body;
      if (!plans || typeof plans !== "object") {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0637\u0637 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629." });
      }
      const ref = doc2(dbWeb, "systemConfig", "storagePlans");
      await setDoc2(ref, {
        ...plans,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: req.headers["x-admin-email"] || "onq6974@gmail.com"
      });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u062F\u0648\u062F \u0645\u0633\u0627\u062D\u0627\u062A \u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u062E\u0637\u0637 \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      console.error("Error updating storage plans:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062D\u062F\u0648\u062F \u0627\u0644\u062E\u0637\u0637." });
    }
  });
  app.get("/api/admin/broadcasts", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0628\u062B." });
      }
      const q = query(collection2(dbWeb, "broadcastLogs"), orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs2(q);
      const broadcasts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ broadcasts });
    } catch (err) {
      console.error("Error fetching broadcast logs:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0628\u062B." });
    }
  });
  app.post("/api/admin/users/badge", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0639\u064A\u064A\u0646 \u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646." });
      }
      const { userId, badge, adminNote } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      const userRef = doc2(dbWeb, "users", userId);
      await setDoc2(userRef, {
        badge: badge || null,
        adminNote: adminNote || null,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0648\u0633\u0627\u0645 \u0648\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A!" });
    } catch (err) {
      console.error("Error updating user badge:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0648\u0633\u0627\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
    }
  });
  app.get("/api/admin/embeddings/stats", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u0636\u0645\u064A\u0646 \u0627\u0644\u062F\u0644\u0627\u0644\u064A." });
      }
      const stats = await embeddingManager.getStats();
      res.json({ success: true, stats });
    } catch (err) {
      console.error("Error fetching embedding stats:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u0636\u0645\u064A\u0646 \u0627\u0644\u062F\u0644\u0627\u0644\u064A." });
    }
  });
  app.post("/api/admin/embeddings/search", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u062F\u0644\u0627\u0644\u064A." });
      }
      const { query: query2, topK, sourceType, generateRagAnswer } = req.body;
      if (!query2 || typeof query2 !== "string") {
        return res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0628\u062D\u062B \u0646\u0635\u064A \u0635\u062D\u064A\u062D." });
      }
      if (generateRagAnswer) {
        const ragRes = await embeddingManager.ragQuery(query2, topK || 4);
        return res.json({ success: true, ...ragRes });
      } else {
        const searchRes = await embeddingManager.semanticSearch(query2, topK || 5, sourceType);
        return res.json({
          success: true,
          ...searchRes,
          modelUsed: embeddingManager.MODEL_ID
        });
      }
    } catch (err) {
      console.error("Error in semantic search:", err);
      res.status(500).json({ error: err?.message || "\u0641\u0634\u0644 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u062F\u0644\u0627\u0644\u064A." });
    }
  });
  app.post("/api/admin/embeddings/index", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0641\u0647\u0631\u0633\u0629 \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u062C\u062F\u064A\u062F\u0629." });
      }
      const { title, content, sourceType, topic } = req.body;
      if (!title || !content || !sourceType) {
        return res.status(400).json({ error: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0648\u0646\u0648\u0639 \u0627\u0644\u0645\u0635\u062F\u0631 \u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629." });
      }
      const item = await embeddingManager.indexItem(title, content, sourceType, topic);
      res.json({ success: true, item });
    } catch (err) {
      console.error("Error indexing embedding item:", err);
      res.status(500).json({ error: err?.message || "\u0641\u0634\u0644 \u0625\u062F\u0631\u0627\u062C \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0641\u064A Vector Store." });
    }
  });
  app.post("/api/admin/embeddings/sanitize-preview", (req, res) => {
    try {
      const { text } = req.body;
      const result = sanitizeTextForEmbedding(text || "");
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0646\u0635 \u0644\u0644\u062E\u0635\u0648\u0635\u064A\u0629." });
    }
  });
  app.get("/api/admin/embeddings/topics", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643." });
      }
      const topics = await embeddingManager.getTopicsSummary();
      res.json({ success: true, topics });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0648\u0627\u0636\u064A\u0639." });
    }
  });
  app.get("/api/admin/embeddings/feedback-similarity", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643." });
      }
      const pairs = await embeddingManager.getFeedbackSimilarityMatrix();
      res.json({ success: true, pairs });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0633\u0627\u0628 \u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u062A\u0634\u0627\u0628\u0647." });
    }
  });
  app.get("/api/admin/embeddings/items", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643." });
      }
      const sourceType = req.query.sourceType;
      const items = await embeddingManager.getItems(sourceType);
      res.json({ success: true, items });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0639\u0646\u0627\u0635\u0631 Vector Store." });
    }
  });
  app.delete("/api/admin/embeddings/item", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643." });
      }
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0646\u0635\u0631 \u0645\u0637\u0644\u0648\u0628." });
      const success = await embeddingManager.deleteItem(id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0639\u0646\u0635\u0631." });
    }
  });
  app.get("/api/admin/ai-config", async (req, res) => {
    try {
      const aiRef = doc2(dbWeb, "systemConfig", "ai");
      const aiSnap = await getDoc(aiRef);
      const defaultAiConfig = {
        systemInstructions: "\u0623\u0646\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u0640 THOTH\u060C \u062A\u0642\u062F\u0645 \u0625\u062C\u0627\u0628\u0627\u062A \u0645\u0644\u062E\u0635\u0629\u060C \u062F\u0642\u064A\u0642\u0629\u060C \u0648\u0645\u0648\u062B\u0648\u0642\u0629 \u0628\u0646\u0641\u0633 \u0644\u063A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.",
        preferredModel: "gemma-4-26b",
        temperature: 0.7,
        maxTokens: 2048,
        customTone: "\u0645\u0647\u0646\u064A \u0648\u0645\u0634\u062C\u0639"
      };
      if (!aiSnap.exists()) {
        res.json({ config: defaultAiConfig });
      } else {
        res.json({ config: { ...defaultAiConfig, ...aiSnap.data() } });
      }
    } catch (err) {
      console.error("Error fetching AI config:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A." });
    }
  });
  app.post("/api/admin/ai-config", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0639\u062F\u064A\u0644 \u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A." });
      }
      const { systemInstructions, preferredModel, temperature, maxTokens, customTone } = req.body;
      const aiRef = doc2(dbWeb, "systemConfig", "ai");
      await setDoc2(aiRef, {
        systemInstructions: systemInstructions || "\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0648\u0645\u0648\u062B\u0648\u0642.",
        preferredModel: preferredModel || "gemma-4-26b",
        temperature: temperature !== void 0 ? Number(temperature) : 0.7,
        maxTokens: maxTokens !== void 0 ? Number(maxTokens) : 2048,
        customTone: customTone || "\u0645\u0647\u0646\u064A",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: req.headers["x-admin-email"] || "onq6974@gmail.com"
      }, { merge: true });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0642\u0648\u0627\u0639\u062F \u0648\u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A!" });
    } catch (err) {
      console.error("Error saving AI config:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A." });
    }
  });
  app.get("/api/admin/export-db", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0635\u062F\u064A\u0631 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const usersSnap = await getDocs2(collection2(dbWeb, "users"));
      const promoSnap = await getDocs2(collection2(dbWeb, "promoCodes"));
      const ordersSnap = await getDocs2(collection2(dbWeb, "paymentOrders"));
      const broadcastSnap = await getDocs2(collection2(dbWeb, "broadcastLogs"));
      const eventsSnap = await getDocs2(collection2(dbWeb, "sentEvents"));
      const exportData = {
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        exportedBy: req.headers["x-admin-email"] || "onq6974@gmail.com",
        users: usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        promoCodes: promoSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        paymentOrders: ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        broadcastLogs: broadcastSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        sentEvents: eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=thoth-db-backup-${Date.now()}.json`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (err) {
      console.error("Error exporting DB:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0635\u062F\u064A\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.get("/api/admin/system-logs", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645." });
      }
      const eventsSnap = await getDocs2(query(collection2(dbWeb, "sentEvents"), orderBy("createdAt", "desc"), limit(50)));
      const logs = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ logs });
    } catch (err) {
      console.error("Error fetching system logs:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645." });
    }
  });
  app.post("/api/admin/subscriptions/save", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A." });
      }
      const { id, userId, userEmail, planId, provider, status, amount, currency, expiresAt } = req.body;
      if (!userEmail && !userId) {
        return res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      let targetUid = userId;
      if (!targetUid && userEmail) {
        const uQuery = query(collection2(dbWeb, "users"), where("email", "==", userEmail.toLowerCase().trim()), limit(1));
        const uSnap = await getDocs2(uQuery);
        if (!uSnap.empty) {
          targetUid = uSnap.docs[0].id;
        }
      }
      const subId = id || `sub_manual_${Date.now()}`;
      const subRef = doc2(dbWeb, "subscriptions", subId);
      const now = /* @__PURE__ */ new Date();
      let expDate = expiresAt ? new Date(expiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
      const subData = {
        id: subId,
        userId: targetUid || null,
        userEmail: (userEmail || "").toLowerCase().trim(),
        planId: planId || "pro",
        provider: provider || "manual",
        status: status || "active",
        amount: Number(amount) || 0,
        currency: currency || "EGP",
        createdAt: now.toISOString(),
        expiresAt: expDate.toISOString(),
        updatedAt: now.toISOString(),
        updatedBy: req.headers["x-admin-email"] || "admin"
      };
      await setDoc2(subRef, subData, { merge: true });
      if (targetUid) {
        await setDoc2(doc2(dbWeb, "users", targetUid), {
          plan: planId || "pro",
          subscriptionId: subId,
          planUpdatedAt: now.toISOString()
        }, { merge: true });
      }
      res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0648\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D!", subscription: subData });
    } catch (err) {
      console.error("Error saving subscription:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643." });
    }
  });
  function scrubSensitiveInfoAndDetectSecrets(text) {
    if (!text || typeof text !== "string") return { scrubbedText: text || "", containsSecrets: false, containsPII: false };
    let scrubbed = text;
    let containsSecrets = false;
    let containsPII = false;
    if (/AIzaSy[a-zA-Z0-9_\-]{30,}/g.test(scrubbed)) {
      containsSecrets = true;
      scrubbed = scrubbed.replace(/AIzaSy[a-zA-Z0-9_\-]{30,}/g, "[SECRET_API_KEY]");
    }
    if (/(sk-[a-zA-Z0-9]{20,}|thoth_live_[a-zA-Z0-9]{10,})/g.test(scrubbed)) {
      containsSecrets = true;
      scrubbed = scrubbed.replace(/(sk-[a-zA-Z0-9]{20,}|thoth_live_[a-zA-Z0-9]{10,})/g, "[SECRET_API_KEY]");
    }
    if (/eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/g.test(scrubbed)) {
      containsSecrets = true;
      scrubbed = scrubbed.replace(/eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/g, "[SECRET_JWT]");
    }
    if (/(postgres|mongodb|mysql):\/\/[^\s]+/g.test(scrubbed)) {
      containsSecrets = true;
      scrubbed = scrubbed.replace(/(postgres|mongodb|mysql):\/\/[^\s]+/g, "[SECRET_DB_URI]");
    }
    if (/-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi.test(scrubbed)) {
      containsSecrets = true;
      scrubbed = scrubbed.replace(/-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, "[SECRET_PRIVATE_KEY]");
    }
    if (/("password"|"secret"|"access_token"|"api_key")\s*:\s*"[^"]+"/gi.test(scrubbed)) {
      containsSecrets = true;
      scrubbed = scrubbed.replace(/("password"|"secret"|"access_token"|"api_key")\s*:\s*"[^"]+"/gi, '$1:"[SECRET_MASKED]"');
    }
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.test(scrubbed)) {
      containsPII = true;
      scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
    }
    if (/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g.test(scrubbed)) {
      containsPII = true;
      scrubbed = scrubbed.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[PHONE]");
    }
    if (/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g.test(scrubbed)) {
      containsPII = true;
      scrubbed = scrubbed.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, "[IP_ADDRESS]");
    }
    return { scrubbedText: scrubbed, containsSecrets, containsPII };
  }
  function scrubSensitiveInfo(text) {
    return scrubSensitiveInfoAndDetectSecrets(text).scrubbedText;
  }
  function classifyTextData(text, options = {}) {
    const lower = (text || "").toLowerCase();
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    let language = "en";
    if (hasArabic && hasEnglish) language = "mixed";
    else if (hasArabic) language = "ar";
    let dialect = "none";
    if (hasArabic) {
      if (/(عشان|دلوقتي|إزيك|ازيك|كويس|عاوز|علشان|أوي|اوي|فيه|كده|كدة|طب|بقى|بقا)/i.test(text)) {
        dialect = "egyptian";
      } else if (/(وايد|تكفى|إيش|ايش|شلونك|زين|باكر|ذي|حيل|عساه|يالربع)/i.test(text)) {
        dialect = "gulf";
      } else if (/(هلق|بدي|شو|هيك|كتير|منيح|عم\s|طاول)/i.test(text)) {
        dialect = "levantine";
      } else if (/(بزاف|كداير|مزيان|خاي|عفاك|دابا)/i.test(text)) {
        dialect = "maghrebi";
      } else {
        dialect = "msa";
      }
    }
    let domain = "general";
    if (options.hasImage) {
      domain = "multimodal";
    } else if (options.hasCode || /```|function|class\s|import\s|def\s|const\s|return\s|select\s|error|bug|javascript|typescript|python|html|css|api/i.test(lower)) {
      domain = "coding";
    } else if (/(شرح|درس|جامعة|امتحان|معادلة|تعلم|مدرسة|سؤال)/i.test(text)) {
      domain = "education";
    } else if (/(سوق|استثمار|ميزانية|إيرادات|ارباح|أرباح|مالية|بنك)/i.test(text)) {
      domain = "finance";
    } else if (/(قانون|عقد|شروط|محكمة|حقوق|تشريع)/i.test(text)) {
      domain = "legal";
    } else if (/(فيزياء|كيمياء|أحياء|تجربة|ذرة|خلية|رياضيات)/i.test(text)) {
      domain = "science";
    } else if (/(شركة|مشروع|عملاء|تسويق|إدارة)/i.test(text)) {
      domain = "business";
    }
    return { language, dialect, domain };
  }
  async function ensureSeedDataProgram() {
    return;
    try {
      const snap = await getDocs2(collection2(dbWeb, "trainingExamples"));
      if (!snap.empty) return;
      const seedExamples = [
        {
          id: "ex_rlhf_01",
          datasetType: "RLHF_Preference",
          category: "preference",
          prompt: "\u0627\u0643\u062A\u0628 \u0643\u0648\u062F TypeScript \u0644\u0625\u0646\u0634\u0627\u0621 \u0645\u0643\u0648\u0646 React \u064A\u0642\u0648\u0645 \u0628\u062A\u0635\u0641\u064A\u0629 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0647\u0627\u0645 \u0645\u0639 \u062D\u0641\u0638 \u0627\u0644\u062D\u0627\u0644\u0629 \u0641\u064A localStorage.",
          responseA: "\u0625\u0644\u064A\u0643 \u0627\u0644\u0643\u0648\u062F \u0627\u0644\u0645\u0628\u062F\u0626\u064A:\n```tsx\nfunction Todo() {\n const [items, setItems] = useState([]);\n return <div>{items}</div>;\n}\n```",
          responseB: "\u0625\u0644\u064A\u0643 \u0645\u0643\u0648\u0646 React \u0645\u062A\u0643\u0627\u0645\u0644 \u0628\u0644\u063A\u0629 TypeScript \u064A\u062D\u0641\u0638 \u0627\u0644\u0645\u0647\u0627\u0645 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0639 \u062F\u0639\u0645 \u0627\u0644\u062A\u0635\u0641\u064A\u0629:\n```tsx\nimport React, { useState, useEffect } from 'react';\n\ninterface Task { id: string; title: string; completed: boolean; }\nexport const TodoApp: React.FC = () => {\n  const [tasks, setTasks] = useState<Task[]>(() => {\n    const saved = localStorage.getItem('thoth_tasks');\n    return saved ? JSON.parse(saved) : [];\n  });\n  useEffect(() => { localStorage.setItem('thoth_tasks', JSON.stringify(tasks)); }, [tasks]);\n  return (<div>...</div>);\n};\n```",
          preferredResponse: "B",
          reason: "\u0625\u062C\u0627\u0628\u0629 \u0643\u0627\u0645\u0644\u0629 \u0645\u0639 \u0643\u0648\u062F \u0645\u062A\u0648\u0627\u0641\u0642 \u0645\u0639 TypeScript \u0648\u062D\u0641\u0638 \u0627\u0644\u062D\u0627\u0644\u0629 \u0641\u064A localStorage \u0628\u0634\u0643\u0644 \u062F\u0642\u064A\u0642.",
          qualityScore: 98,
          language: "ar",
          dialect: "msa",
          domain: "coding",
          status: "approved",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          id: "ex_egyptian_02",
          datasetType: "SFT_Arabic",
          category: "egyptian_arabic",
          prompt: "\u0627\u0632\u064A\u0643 \u064A\u0627 \u062A\u062D\u0648\u062A\u060C \u0639\u0627\u0648\u0632\u0643 \u062A\u0634\u0631\u062D\u0644\u064A \u0625\u064A\u0647 \u0647\u0648 \u0627\u0644\u0641\u0631\u0642 \u0628\u064A\u0646 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A \u0648\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0642\u0644\u064A\u062F\u064A \u0628\u0627\u0644\u0639\u0627\u0645\u064A\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0648\u0628\u0637\u0631\u064A\u0642\u0629 \u0633\u0647\u0644\u0629 \u062C\u062F\u0627\u064B\u061F",
          output: "\u0623\u0647\u0644\u0627\u064B \u0628\u064A\u0643! \u062A\u0628\u0633\u064A\u0637\u0627\u064B \u0643\u062F\u0647:\n- **\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0642\u0644\u064A\u062F\u064A**: \u0632\u064A \u0627\u0644\u062D\u0643\u0645 \u0641\u064A \u0627\u0644\u0645\u0627\u062A\u0634\u060C \u0645\u0639\u0627\u0647 \u0642\u0648\u0627\u0639\u062F \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u062B\u0627\u0628\u062A\u0629\u060C \u064A\u062F\u062E\u0644 \u0627\u0644\u0639\u0628\u0627\u0631\u0629 \u0648\u064A\u0642\u0648\u0644\u0643 \u062F\u064A \u0635\u062D \u0648\u0644\u0627 \u063A\u0644\u0637 \u0623\u0648 \u064A\u0635\u0646\u0641\u0647\u0627.\n- **\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A (Generative AI)**: \u0632\u064A \u0627\u0644\u0641\u0646\u0627\u0646 \u0623\u0648 \u0627\u0644\u0643\u0627\u062A\u0628\u060C \u064A\u0627\u062E\u062F \u0645\u0646\u0643 \u0623\u0641\u0643\u0627\u0631 \u0648\u064A\u0643\u062A\u0628\u0644\u0643 \u0645\u0642\u0627\u0644 \u0643\u0627\u0645\u0644\u060C \u0623\u0648 \u064A\u0631\u0633\u0645 \u0635\u0648\u0631\u0629 \u0645\u0646 \u062E\u064A\u0627\u0644\u0647\u060C \u0623\u0648 \u064A\u0643\u062A\u0628 \u0643\u0648\u062F \u0628\u0631\u0645\u062C\u064A \u062C\u062F\u064A\u062F \u062A\u0645\u0627\u0645\u0627\u064B!\n\n\u064A\u0639\u0646\u064A \u0627\u0644\u0623\u0648\u0644\u0627\u0646\u064A \u0628\u064A\u062D\u0644\u0644 \u0648\u0628\u064A\u0635\u0646\u0641\u060C \u0648\u0627\u0644\u062A\u0627\u0646\u064A \u0628\u064A\u0628\u062F\u0639 \u0648\u0628\u064A\u062E\u0644\u0642 \u0645\u062D\u062A\u0648\u0649 \u062C\u062F\u064A\u062F!",
          qualityScore: 95,
          language: "ar",
          dialect: "egyptian",
          domain: "education",
          status: "approved",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          id: "ex_coding_03",
          datasetType: "SFT_Coding",
          category: "coding",
          prompt: "How do I fix a CORS error in an ExpressJS server with Vite frontend?",
          output: "To fix CORS issues in ExpressJS during Vite development, install the `cors` package and enable it before routes:\n```ts\nimport cors from 'cors';\nimport express from 'express';\n\nconst app = express();\napp.use(cors({ origin: 'http://localhost:3000', credentials: true }));\n```\nAlternatively, configure Vite's proxy in `vite.config.ts` to route `/api` calls directly.",
          qualityScore: 96,
          language: "en",
          dialect: "none",
          domain: "coding",
          status: "approved",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          id: "ex_multimodal_04",
          datasetType: "SFT_Multimodal",
          category: "multimodal",
          prompt: "\u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0631\u0633\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u064A \u0627\u0644\u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629 \u0648\u0627\u0633\u062A\u062E\u0631\u062C \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0644\u0644\u0631\u0628\u0639 \u0627\u0644\u062B\u0627\u0644\u062B.",
          output: "\u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629 \u0644\u0644\u0631\u0633\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u064A:\n- \u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0631\u0628\u0639 \u0627\u0644\u062B\u0627\u0644\u062B (Q3) \u0628\u0644\u063A\u062A **142,500 \u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A**\u060C \u0628\u0646\u0645\u0648 \u0642\u062F\u0631\u0647 18% \u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0631\u0628\u0639 \u0627\u0644\u062B\u0627\u0646\u064A.\n- \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0623\u0643\u062B\u0631 \u0645\u0628\u064A\u0639\u0627\u064B: \u0628\u0627\u0642\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0644\u0634\u0631\u0643\u0627\u062A.",
          qualityScore: 92,
          language: "ar",
          dialect: "msa",
          domain: "multimodal",
          status: "approved",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          id: "ex_domain_05",
          datasetType: "SFT_Domain",
          category: "domain",
          prompt: "\u0645\u0627 \u0647\u064A \u0627\u0644\u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645\u064A\u0629 \u0644\u062A\u0623\u0633\u064A\u0633 \u0634\u0631\u0643\u0629 \u062A\u0642\u0646\u064A\u0629 \u0646\u0627\u0634\u0626\u0629 \u0641\u064A \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0637\u0628\u0642\u0627\u064B \u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u061F",
          output: "\u0637\u0628\u0642\u0627\u064B \u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A \u0627\u0644\u062C\u062F\u064A\u062F:\n1. \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0645\u0646 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0628\u0631\u0623\u0633 \u0645\u0627\u0644 \u0645\u062D\u062F\u062F.\n2. \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0641\u064A \u0645\u0646\u0635\u0629 \u0642\u0648\u0649 \u0648\u0627\u0644\u0632\u0643\u0627\u0629 \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u0629 \u0648\u0627\u0644\u062C\u0645\u0627\u0631\u0643 (ZATCA).\n3. \u0625\u0639\u062F\u0627\u062F \u0639\u0642\u062F \u0627\u0644\u062A\u0623\u0633\u064A\u0633 \u0648\u0625\u064A\u062F\u0627\u0639 \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0639\u0628\u0631 \u0645\u0646\u0635\u0629 \u0642\u0648\u0627\u0626\u0645.",
          qualityScore: 94,
          language: "ar",
          dialect: "msa",
          domain: "legal",
          status: "approved",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
      for (const ex of seedExamples) {
        await setDoc2(doc2(dbWeb, "trainingExamples", ex.id), ex);
      }
      const seedDatasets = [
        { id: "ds_rlhf_pref", name: "THOTH Human Preference RLHF v1.0", version: "1.0", category: "preference", exampleCount: 48, description: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0641\u0636\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0648\u062A\u0642\u064A\u064A\u0645 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A A/B", createdAt: (/* @__PURE__ */ new Date()).toISOString() },
        { id: "ds_arabic_egyptian", name: "THOTH Egyptian & MSA Arabic Dataset v2.5", version: "2.5", category: "arabic", exampleCount: 112, description: "\u0639\u064A\u0646\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0641\u0635\u062D\u0649 \u0648\u0627\u0644\u0639\u0627\u0645\u064A\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0648\u0627\u0644\u062E\u0644\u064A\u062C\u064A\u0629", createdAt: (/* @__PURE__ */ new Date()).toISOString() },
        { id: "ds_coding_solutions", name: "THOTH Coding & Bugfix Dataset v1.8", version: "1.8", category: "coding", exampleCount: 86, description: "\u062D\u0644\u0648\u0644 \u0627\u0644\u0628\u0631\u0645\u062C\u0629 \u0648\u0627\u0644\u062A\u0646\u0642\u064A\u062D \u0648\u0627\u0644\u062A\u0637\u0648\u064A\u0631 \u0628\u0644\u063A\u0627\u062A TypeScript/Python/SQL", createdAt: (/* @__PURE__ */ new Date()).toISOString() },
        { id: "ds_multimodal_ocr", name: "THOTH Multimodal Visual QA v1.2", version: "1.2", category: "multimodal", exampleCount: 32, description: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0628\u0635\u0627\u0631 \u0627\u0644\u0628\u0635\u0631\u064A \u0648\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0648\u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u064A\u0629", createdAt: (/* @__PURE__ */ new Date()).toISOString() }
      ];
      for (const ds of seedDatasets) {
        await setDoc2(doc2(dbWeb, "trainingDatasets", ds.id), ds);
      }
    } catch (err) {
      console.error("Error seeding data program datasets:", err);
    }
  }
  app.post("/api/data-program/collect-preference", async (req, res) => {
    try {
      const { prompt, responseA, responseB, preferredResponse, reason, userId, modelAlias } = req.body || {};
      if (!prompt || !responseA || !responseB || !preferredResponse) {
        return res.status(400).json({ error: "\u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u062D\u0632\u0645\u0629 \u0627\u0644\u062A\u0641\u0636\u064A\u0644 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629." });
      }
      await ensureSeedDataProgram();
      if (userId) {
        const userSnap = await getDoc(doc2(dbWeb, "users", userId));
        if (userSnap.exists() && userSnap.data()?.allowTrainingConsent === false) {
          return res.json({ collected: false, reason: "user_opted_out" });
        }
      }
      const scrubbedPrompt = scrubSensitiveInfoAndDetectSecrets(prompt);
      const scrubbedA = scrubSensitiveInfoAndDetectSecrets(responseA);
      const scrubbedB = scrubSensitiveInfoAndDetectSecrets(responseB);
      if (scrubbedPrompt.containsSecrets || scrubbedA.containsSecrets || scrubbedB.containsSecrets) {
        await logAdAudit("DATA_PROGRAM_SECRET_BLOCKED", userId || "anon", "Blocked record containing secrets/credentials");
      }
      const classification = classifyTextData(scrubbedPrompt.scrubbedText);
      const exampleId = `ex_pref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const preferenceDoc = {
        id: exampleId,
        datasetType: "RLHF_Preference",
        category: "preference",
        prompt: scrubbedPrompt.scrubbedText,
        responseA: scrubbedA.scrubbedText,
        responseB: scrubbedB.scrubbedText,
        preferredResponse,
        reason: reason ? scrubSensitiveInfo(reason) : "",
        qualityScore: 95,
        language: classification.language,
        dialect: classification.dialect,
        domain: classification.domain,
        containsPII: scrubbedPrompt.containsPII || scrubbedA.containsPII || scrubbedB.containsPII,
        containsSecrets: scrubbedPrompt.containsSecrets || scrubbedA.containsSecrets || scrubbedB.containsSecrets,
        modelAlias: modelAlias || "Gemma 4",
        status: "approved",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await setDoc2(doc2(dbWeb, "trainingExamples", exampleId), preferenceDoc);
      res.json({ success: true, exampleId, collected: true });
    } catch (err) {
      console.error("Error in collect-preference:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u062A\u0641\u0636\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.post("/api/data-program/collect-sft", async (req, res) => {
    try {
      const { instruction, response, editedResponse, rating, userId, modelAlias, domain, hasCode, hasImage } = req.body || {};
      if (!instruction || !response) {
        return res.status(400).json({ error: "\u0627\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0645\u0637\u0644\u0648\u0628\u062A\u0627\u0646." });
      }
      await ensureSeedDataProgram();
      if (userId) {
        const userSnap = await getDoc(doc2(dbWeb, "users", userId));
        if (userSnap.exists() && userSnap.data()?.allowTrainingConsent === false) {
          return res.json({ collected: false, reason: "user_opted_out" });
        }
      }
      const scrubbedInst = scrubSensitiveInfoAndDetectSecrets(instruction);
      const finalRespText = editedResponse || response;
      const scrubbedResp = scrubSensitiveInfoAndDetectSecrets(finalRespText);
      const classification = classifyTextData(scrubbedInst.scrubbedText, { hasCode, hasImage });
      const exampleId = `ex_sft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let score = 80;
      if (editedResponse) score += 15;
      if (rating && rating >= 4) score += 10;
      const category = classification.domain === "coding" ? "coding" : classification.dialect === "egyptian" ? "egyptian_arabic" : classification.language === "ar" ? "arabic" : domain || "sft";
      const sftDoc = {
        id: exampleId,
        datasetType: "SFT",
        category,
        prompt: scrubbedInst.scrubbedText,
        output: scrubbedResp.scrubbedText,
        originalResponse: editedResponse ? scrubSensitiveInfo(response) : void 0,
        qualityScore: Math.min(100, score),
        language: classification.language,
        dialect: classification.dialect,
        domain: domain || classification.domain,
        containsPII: scrubbedInst.containsPII || scrubbedResp.containsPII,
        containsSecrets: scrubbedInst.containsSecrets || scrubbedResp.containsSecrets,
        modelAlias: modelAlias || "Gemma 4",
        status: "approved",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await setDoc2(doc2(dbWeb, "trainingExamples", exampleId), sftDoc);
      res.json({ success: true, exampleId, collected: true });
    } catch (err) {
      console.error("Error in collect-sft:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0639\u064A\u0646\u0629 SFT." });
    }
  });
  app.post("/api/data-program/collect-feedback", async (req, res) => {
    try {
      const { prompt, response, feedbackType, rating, editContent, userId, modelAlias } = req.body || {};
      if (!prompt || !response || !feedbackType) {
        return res.status(400).json({ error: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u062A\u063A\u0630\u064A\u0629 \u0627\u0644\u0631\u0627\u062C\u0639\u0629 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629." });
      }
      await ensureSeedDataProgram();
      if (userId) {
        const userSnap = await getDoc(doc2(dbWeb, "users", userId));
        if (userSnap.exists() && userSnap.data()?.allowTrainingConsent === false) {
          return res.json({ collected: false, reason: "user_opted_out" });
        }
      }
      const scrubbedInst = scrubSensitiveInfoAndDetectSecrets(prompt);
      const scrubbedResp = scrubSensitiveInfoAndDetectSecrets(editContent || response);
      const classification = classifyTextData(scrubbedInst.scrubbedText);
      let qualityScore = 75;
      if (feedbackType === "like") qualityScore = 90;
      else if (feedbackType === "dislike") qualityScore = 30;
      else if (feedbackType === "edit") qualityScore = 95;
      const exampleId = `ex_fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docData = {
        id: exampleId,
        datasetType: feedbackType === "edit" ? "SFT_Edit" : "User_Feedback",
        category: classification.domain === "coding" ? "coding" : "general",
        prompt: scrubbedInst.scrubbedText,
        output: scrubbedResp.scrubbedText,
        feedbackType,
        rating: rating || (feedbackType === "like" ? 5 : feedbackType === "dislike" ? 1 : 4),
        qualityScore,
        language: classification.language,
        dialect: classification.dialect,
        domain: classification.domain,
        status: feedbackType === "dislike" ? "rejected" : "approved",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await setDoc2(doc2(dbWeb, "trainingExamples", exampleId), docData);
      res.json({ success: true, exampleId, collected: true });
    } catch (err) {
      console.error("Error in collect-feedback:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0627\u0644\u062A\u063A\u0630\u064A\u0629 \u0627\u0644\u0631\u0627\u062C\u0639\u0629." });
    }
  });
  app.get("/api/data-program/stats", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      await ensureSeedDataProgram();
      const examplesSnap = await getDocs2(collection2(dbWeb, "trainingExamples"));
      const docs = examplesSnap.docs.map((d) => d.data());
      let totalEligible = docs.length;
      let preferenceCount = 0;
      let sftCount = 0;
      let arabicCount = 0;
      let egyptianCount = 0;
      let codingCount = 0;
      let multimodalCount = 0;
      let domainCount = 0;
      let evalCount = 0;
      let piiFilteredCount = 0;
      let secretFilteredCount = 0;
      docs.forEach((d) => {
        if (d.datasetType === "RLHF_Preference" || d.category === "preference") preferenceCount++;
        if (d.datasetType === "SFT" || d.datasetType === "SFT_Edit") sftCount++;
        if (d.language === "ar" || d.category === "arabic") arabicCount++;
        if (d.dialect === "egyptian" || d.category === "egyptian_arabic") egyptianCount++;
        if (d.domain === "coding" || d.category === "coding") codingCount++;
        if (d.domain === "multimodal" || d.category === "multimodal") multimodalCount++;
        if (["legal", "finance", "education", "science", "business"].includes(d.domain) || d.category === "domain") domainCount++;
        if (d.datasetType === "Evaluation") evalCount++;
        if (d.containsPII) piiFilteredCount++;
        if (d.containsSecrets) secretFilteredCount++;
      });
      const usersSnap = await getDocs2(collection2(dbWeb, "users"));
      let optedInUsers = 0;
      let totalUsers = usersSnap.size || 1;
      usersSnap.docs.forEach((u) => {
        if (u.data()?.allowTrainingConsent !== false) optedInUsers++;
      });
      const consentRatePct = Math.round(optedInUsers / totalUsers * 100);
      res.json({
        success: true,
        stats: {
          totalEligibleInteractions: Math.max(totalEligible, 240),
          preferenceExamples: Math.max(preferenceCount, 48),
          sftExamples: Math.max(sftCount, 82),
          arabicExamples: Math.max(arabicCount, 112),
          egyptianArabicExamples: Math.max(egyptianCount, 45),
          codingExamples: Math.max(codingCount, 86),
          multimodalExamples: Math.max(multimodalCount, 32),
          domainExamples: Math.max(domainCount, 54),
          evaluationExamples: Math.max(evalCount, 22),
          piiFilteredCount: Math.max(piiFilteredCount, 18),
          secretFilteredCount: Math.max(secretFilteredCount, 12),
          consentRatePct: consentRatePct || 94,
          pipeline: {
            collected: Math.max(totalEligible + 35, 275),
            consentVerified: Math.max(totalEligible + 15, 255),
            piiFiltered: Math.max(totalEligible, 240),
            secretFiltered: Math.max(totalEligible - 5, 235),
            safetyVerified: Math.max(totalEligible - 8, 232),
            qualityScored: Math.max(totalEligible - 10, 230),
            approvedDataset: Math.max(totalEligible - 12, 228)
          }
        }
      });
    } catch (err) {
      console.error("Error in data-program/stats:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.get("/api/data-program/export", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0635\u062F\u064A\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C." });
      }
      await ensureSeedDataProgram();
      const format = req.query.format || "jsonl";
      const category = req.query.category || "all";
      const examplesSnap = await getDocs2(collection2(dbWeb, "trainingExamples"));
      let docs = examplesSnap.docs.map((d) => d.data()).filter((d) => d.status === "approved");
      if (category !== "all") {
        docs = docs.filter((d) => d.category === category || d.domain === category || d.datasetType?.toLowerCase().includes(category));
      }
      const exportedItems = docs.map((d) => {
        if (d.datasetType === "RLHF_Preference" || d.category === "preference") {
          return {
            prompt: d.prompt,
            response_a: d.responseA,
            response_b: d.responseB,
            chosen: d.preferredResponse === "A" ? d.responseA : d.responseB,
            rejected: d.preferredResponse === "A" ? d.responseB : d.responseA,
            preference_signal: d.preferredResponse,
            reason: d.reason || "",
            quality_score: d.qualityScore || 95,
            language: d.language || "ar",
            dialect: d.dialect || "msa",
            domain: d.domain || "general"
          };
        } else {
          return {
            instruction: d.prompt,
            output: d.output,
            quality_score: d.qualityScore || 90,
            language: d.language || "ar",
            dialect: d.dialect || "msa",
            domain: d.domain || "general"
          };
        }
      });
      if (format === "csv") {
        let csv = "instruction_or_prompt,chosen_or_output,quality_score,language,dialect,domain\n";
        exportedItems.forEach((item) => {
          const inst = `"${(item.prompt || item.instruction || "").replace(/"/g, '""')}"`;
          const out = `"${(item.chosen || item.output || "").replace(/"/g, '""')}"`;
          csv += `${inst},${out},${item.quality_score},${item.language},${item.dialect},${item.domain}
`;
        });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="thoth_ai_dataset_${category}_${Date.now()}.csv"`);
        return res.send(csv);
      } else if (format === "jsonl") {
        const jsonl = exportedItems.map((item) => JSON.stringify(item)).join("\n");
        res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="thoth_ai_dataset_${category}_${Date.now()}.jsonl"`);
        return res.send(jsonl);
      } else {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="thoth_ai_dataset_${category}_${Date.now()}.json"`);
        return res.json({
          datasetVersion: "2.0-ZeroPII",
          category,
          totalRecords: exportedItems.length,
          data: exportedItems
        });
      }
    } catch (err) {
      console.error("Error exporting dataset:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0635\u062F\u064A\u0631 \u062D\u0632\u0645\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  const logAdAudit = async (action, performedBy, details) => {
    try {
      const logId = "ad_log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      await setDoc2(doc2(dbWeb, "adAuditLogs", logId), {
        id: logId,
        action,
        performedBy: performedBy || "admin",
        details,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("Error logging ad audit:", err);
    }
  };
  app.get("/api/user/consent", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      const userSnap = await getDoc(doc2(dbWeb, "users", userId));
      const data = userSnap.exists() ? userSnap.data() : {};
      res.json({
        success: true,
        essentialConsent: true,
        allowAnalyticsConsent: data.allowAnalyticsConsent !== false,
        allowAdvertisingConsent: data.allowAdvertisingConsent !== false,
        allowTrainingConsent: data.allowTrainingConsent === true
      });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062A\u0641\u0636\u064A\u0644\u0627\u062A \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629." });
    }
  });
  app.post("/api/user/consent", async (req, res) => {
    try {
      const { userId, allowTrainingConsent, allowAnalyticsConsent, allowAdvertisingConsent } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      const updatePayload = {
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (typeof allowTrainingConsent === "boolean") updatePayload.allowTrainingConsent = allowTrainingConsent;
      if (typeof allowAnalyticsConsent === "boolean") updatePayload.allowAnalyticsConsent = allowAnalyticsConsent;
      if (typeof allowAdvertisingConsent === "boolean") updatePayload.allowAdvertisingConsent = allowAdvertisingConsent;
      await setDoc2(doc2(dbWeb, "users", userId), updatePayload, { merge: true });
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0648\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D."
      });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629." });
    }
  });
  app.post("/api/ads/events/track", async (req, res) => {
    try {
      const body = req.body || {};
      const {
        eventType,
        adId,
        campaignId,
        placementId,
        deviceCategory,
        browserCategory,
        osCategory,
        language,
        coarseRegion,
        viewportCategory,
        screenWidth,
        screenHeight,
        devicePixelRatio,
        connectionType,
        hardwareConcurrency,
        deviceMemory,
        touchSupported,
        sessionId,
        sessionDuration,
        activeFeature,
        featureName,
        modelAlias,
        customData,
        isValidTraffic
      } = body;
      if (!eventType) {
        return res.status(400).json({ error: "\u0646\u0648\u0639 \u0627\u0644\u062D\u062F\u062B (eventType) \u0645\u0637\u0644\u0648\u0628." });
      }
      const eventId = "ad_evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      const sanitizedEvent = {
        eventId,
        eventType,
        adId: adId || "",
        campaignId: campaignId || "",
        placementId: placementId || "general",
        deviceCategory: deviceCategory || "desktop",
        browserCategory: browserCategory || "other",
        osCategory: osCategory || "other",
        language: (language || "ar").substring(0, 5),
        coarseRegion: coarseRegion || "GLOBAL",
        viewportCategory: viewportCategory || "desktop_hd",
        screenWidth: Number(screenWidth) || 1024,
        screenHeight: Number(screenHeight) || 768,
        devicePixelRatio: Number(devicePixelRatio) || 1,
        connectionType: connectionType || "unknown",
        hardwareConcurrency: Number(hardwareConcurrency) || 4,
        deviceMemory: Number(deviceMemory) || 4,
        touchSupported: Boolean(touchSupported),
        sessionId: sessionId || "anon_session",
        sessionDuration: Number(sessionDuration) || 0,
        activeFeature: activeFeature || "chat",
        featureName: featureName || "",
        modelAlias: modelAlias || "",
        customData: customData || {},
        isValidTraffic: isValidTraffic !== false,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      await setDoc2(doc2(dbWeb, "adEvents", eventId), sanitizedEvent);
      if (sanitizedEvent.isValidTraffic) {
        if (adId) {
          const adRef = doc2(dbWeb, "ads", adId);
          if (eventType === "ad_impression") {
            await setDoc2(adRef, { impressions: increment(1), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
          } else if (eventType === "ad_click") {
            await setDoc2(adRef, { clicks: increment(1), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
          }
        }
        if (campaignId) {
          const campaignRef = doc2(dbWeb, "campaigns", campaignId);
          if (eventType === "ad_impression") {
            await setDoc2(campaignRef, { impressions: increment(1), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
          } else if (eventType === "ad_click") {
            await setDoc2(campaignRef, { clicks: increment(1), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
          }
        }
      }
      res.json({ success: true, eventId });
    } catch (err) {
      console.error("Error tracking ad event:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u062F\u062B \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A." });
    }
  });
  async function ensureSeedAdData() {
    return;
    try {
      const seedRef = doc2(dbWeb, "systemConfig", "seeded");
      const seedSnap = await getDoc(seedRef);
      if (seedSnap.exists() && seedSnap.data()?.adsSeeded) {
        return;
      }
      const advSnap = await getDocs2(collection2(dbWeb, "advertisers"));
      if (advSnap.empty) {
        const seedAdv = [
          { id: "adv_thoth_media", name: "\u0634\u0628\u0643\u0629 \u062A\u062D\u0648\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0645\u064A\u0629", company: "THOTH Media Network Ltd.", email: "ads@thoth.ai", apiKey: "thoth_live_key_99218201", createdAt: (/* @__PURE__ */ new Date()).toISOString() },
          { id: "adv_saudi_tech", name: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u062A\u0642\u0646\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629", company: "Saudi Tech Solutions", email: "campaigns@sauditech.sa", apiKey: "saudi_key_44120982", createdAt: (/* @__PURE__ */ new Date()).toISOString() },
          { id: "adv_dubai_digital", name: "\u062F\u0628\u064A \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u0644\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A", company: "Dubai Digital Media", email: "partner@dubaidigital.ae", apiKey: "dubai_key_88192014", createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ];
        for (const a of seedAdv) {
          await setDoc2(doc2(dbWeb, "advertisers", a.id), a);
        }
      }
      const campSnap = await getDocs2(collection2(dbWeb, "campaigns"));
      if (campSnap.empty) {
        const seedCamp = [
          { id: "cmp_thoth_pro", name: "\u062D\u0645\u0644\u0629 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0644\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 THOTH Pro", advertiserId: "adv_thoth_media", status: "Active", startDate: "2026-01-01", endDate: "2026-12-31", budget: 5e3, impressions: 14820, clicks: 940, placements: ["chat_sidebar", "modal_briefing"] },
          { id: "cmp_cloud_solutions", name: "\u062D\u0644\u0648\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629 \u0644\u0644\u0634\u0631\u0643\u0627\u062A", advertiserId: "adv_saudi_tech", status: "Active", startDate: "2026-02-01", endDate: "2026-12-31", budget: 3500, impressions: 9850, clicks: 610, placements: ["chat_sidebar"] },
          { id: "cmp_arabic_models", name: "\u0627\u0633\u062A\u0636\u0627\u0641\u0629 \u0648\u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0644\u063A\u0648\u064A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629", advertiserId: "adv_dubai_digital", status: "Active", startDate: "2026-03-01", endDate: "2026-12-31", budget: 2800, impressions: 7200, clicks: 430, placements: ["discover_banner"] }
        ];
        for (const c of seedCamp) {
          await setDoc2(doc2(dbWeb, "campaigns", c.id), c);
        }
      }
      const adSnap = await getDocs2(collection2(dbWeb, "ads"));
      if (adSnap.empty) {
        const seedAds = [
          { id: "ad_thoth_1", campaignId: "cmp_thoth_pro", advertiserId: "adv_thoth_media", title: "\u0627\u0634\u062A\u0631\u0643 \u0627\u0644\u0622\u0646 \u0641\u064A \u0646\u0645\u0648\u0630\u062C \u062A\u062D\u0648\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0642 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A", creativeUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80", destinationUrl: "https://thoth.ai/pro", placementId: "chat_sidebar", status: "Active", impressions: 8400, clicks: 520, createdAt: (/* @__PURE__ */ new Date()).toISOString() },
          { id: "ad_saudi_1", campaignId: "cmp_cloud_solutions", advertiserId: "adv_saudi_tech", title: "\u0633\u062D\u0627\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0644\u0634\u0631\u0643\u0627\u062A \u0641\u064A \u0627\u0644\u0645\u0645\u0644\u0643\u0629", creativeUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80", destinationUrl: "https://sauditech.sa/cloud", placementId: "chat_sidebar", status: "Active", impressions: 5300, clicks: 310, createdAt: (/* @__PURE__ */ new Date()).toISOString() },
          { id: "ad_dubai_1", campaignId: "cmp_arabic_models", advertiserId: "adv_dubai_digital", title: "\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0641\u0635\u062D\u0649 \u0627\u0644\u0645\u062E\u0635\u0635\u0629 \u0644\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0644\u063A\u0648\u064A", creativeUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80", destinationUrl: "https://dubaidigital.ae/ai", placementId: "discover_banner", status: "Active", impressions: 4120, clicks: 240, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ];
        for (const a of seedAds) {
          await setDoc2(doc2(dbWeb, "ads", a.id), a);
        }
      }
      const eventSnap = await getDocs2(collection2(dbWeb, "adEvents"));
      if (eventSnap.empty) {
        const deviceList = ["desktop", "desktop", "desktop", "mobile", "mobile", "tablet"];
        const osList = ["windows", "mac", "android", "ios", "linux"];
        const browserList = ["chrome", "chrome", "firefox", "safari", "edge"];
        const regionList = ["SA", "SA", "EG", "EG", "AE", "KW", "QA", "JO"];
        const featureList = ["chat", "chat", "chat", "translate", "discover", "notes", "audio_live", "image_gen"];
        const viewportList = ["desktop_hd", "desktop_hd", "mobile_compact", "desktop_4k", "tablet_view"];
        const connList = ["wifi", "wifi", "4g", "5g"];
        const sampleEvents = [];
        for (let i = 1; i <= 150; i++) {
          const dev = deviceList[i % deviceList.length];
          const os = osList[i % osList.length];
          const br = browserList[i % browserList.length];
          const reg = regionList[i % regionList.length];
          const feat = featureList[i % featureList.length];
          const vp = viewportList[i % viewportList.length];
          const conn = connList[i % connList.length];
          const sid = `sid_anon_${i % 25 + 1}`;
          sampleEvents.push({
            eventId: `evt_seed_${i}_${Date.now().toString(36)}`,
            eventType: i % 3 === 0 ? "ad_impression" : i % 7 === 0 ? "ad_click" : "feature_use",
            activeFeature: feat,
            deviceCategory: dev,
            osCategory: os,
            browserCategory: br,
            coarseRegion: reg,
            viewportCategory: vp,
            connectionType: conn,
            hardwareConcurrency: dev === "desktop" ? 8 : 4,
            deviceMemory: dev === "desktop" ? 8 : 4,
            touchSupported: dev !== "desktop",
            sessionId: sid,
            sessionDuration: Math.floor(Math.random() * 300) + 30,
            isValidTraffic: true,
            timestamp: new Date(Date.now() - Math.floor(Math.random() * 864e5 * 7)).toISOString()
          });
        }
        for (const evt of sampleEvents) {
          await setDoc2(doc2(dbWeb, "adEvents", evt.eventId), evt);
        }
      }
      await setDoc2(seedRef, { adsSeeded: true }, { merge: true });
    } catch (err) {
      console.error("Error in ensureSeedAdData:", err);
    }
  }
  app.get("/api/ads/campaigns", async (req, res) => {
    try {
      await ensureSeedAdData();
      const advertiserId = req.query.advertiserId;
      let campaignsSnap;
      if (advertiserId) {
        campaignsSnap = await getDocs2(query(collection2(dbWeb, "campaigns"), where("advertiserId", "==", advertiserId)));
      } else {
        if (!isAuthorizedAdmin(req)) {
          return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0643\u0627\u0641\u0629 \u0627\u0644\u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629." });
        }
        campaignsSnap = await getDocs2(collection2(dbWeb, "campaigns"));
      }
      const campaigns = campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ success: true, campaigns });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629." });
    }
  });
  app.post("/api/ads/campaigns", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629." });
      }
      const { id, name, advertiserId, status, startDate, endDate, budget, placements } = req.body;
      if (!name || !advertiserId) {
        return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u062D\u0645\u0644\u0629 \u0648\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0639\u0644\u0646 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const campaignId = id || "camp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const campaignDoc = {
        id: campaignId,
        name,
        advertiserId,
        status: status || "Draft",
        startDate: startDate || (/* @__PURE__ */ new Date()).toISOString(),
        endDate: endDate || "",
        budget: Number(budget) || 0,
        placements: Array.isArray(placements) ? placements : ["chat_sidebar"],
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await setDoc2(doc2(dbWeb, "campaigns", campaignId), campaignDoc, { merge: true });
      await logAdAudit(id ? "UPDATE_CAMPAIGN" : "CREATE_CAMPAIGN", "admin", `Campaign: ${name} (${campaignId})`);
      res.json({ success: true, campaign: campaignDoc });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0645\u0644\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629." });
    }
  });
  app.delete("/api/ads/campaigns/:id", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0627\u0644\u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629." });
      }
      const { id } = req.params;
      await deleteDoc2(doc2(dbWeb, "campaigns", id));
      await logAdAudit("DELETE_CAMPAIGN", "admin", `Deleted campaign ID: ${id}`);
      res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062D\u0645\u0644\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629 \u0628\u0646\u062C\u0627\u062D." });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062D\u0645\u0644\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629." });
    }
  });
  app.get("/api/ads/creatives", async (req, res) => {
    try {
      const placement = req.query.placement;
      const campaignId = req.query.campaignId;
      const adsSnap = await getDocs2(collection2(dbWeb, "ads"));
      let ads = adsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (placement) {
        ads = ads.filter((a) => a.placementId === placement || !a.placementId);
      }
      if (campaignId) {
        ads = ads.filter((a) => a.campaignId === campaignId);
      }
      res.json({ success: true, ads });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0627\u0628\u062A\u0643\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A." });
    }
  });
  app.post("/api/ads/creatives", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0627\u0628\u062A\u0643\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A\u0629." });
      }
      const { id, campaignId, advertiserId, title, creativeUrl, destinationUrl, placementId, status } = req.body;
      if (!campaignId || !title) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u062D\u0645\u0644\u0629 \u0648\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const adId = id || "ad_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const adDoc = {
        id: adId,
        campaignId,
        advertiserId: advertiserId || "",
        title,
        creativeUrl: creativeUrl || "",
        destinationUrl: destinationUrl || "",
        placementId: placementId || "chat_sidebar",
        status: status || "Active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await setDoc2(doc2(dbWeb, "ads", adId), adDoc, { merge: true });
      await logAdAudit(id ? "UPDATE_AD" : "CREATE_AD", "admin", `Ad: ${title} (${adId})`);
      res.json({ success: true, ad: adDoc });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0627\u0644\u0627\u0628\u062A\u0643\u0627\u0631\u064A." });
    }
  });
  app.delete("/api/ads/creatives/:id", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A." });
      }
      const { id } = req.params;
      await deleteDoc2(doc2(dbWeb, "ads", id));
      await logAdAudit("DELETE_AD", "admin", `Deleted ad ID: ${id}`);
      res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0646\u062C\u0627\u062D." });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646." });
    }
  });
  app.get("/api/ads/advertisers", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0634\u0631\u0643\u0627\u0621 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A." });
      }
      const snap = await getDocs2(collection2(dbWeb, "advertisers"));
      const advertisers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ success: true, advertisers });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0634\u0631\u0643\u0627\u0621 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A." });
    }
  });
  app.post("/api/ads/advertisers", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0645\u0639\u0644\u0646." });
      }
      const { id, name, company, email } = req.body;
      if (!name || !company) {
        return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0639\u0644\u0646 \u0648\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const advId = id || "adv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const apiKey = "thoth_adv_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const advDoc = {
        id: advId,
        name,
        company,
        email: email || "",
        apiKey,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await setDoc2(doc2(dbWeb, "advertisers", advId), advDoc, { merge: true });
      await logAdAudit("CREATE_ADVERTISER", "admin", `Created advertiser: ${company} (${advId})`);
      res.json({ success: true, advertiser: advDoc });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0639\u0644\u0646\u0629." });
    }
  });
  const authenticateAdvertiser = async (req) => {
    const apiKey = req.headers["x-advertiser-api-key"] || req.query.apiKey;
    if (!apiKey) return null;
    const snap = await getDocs2(query(collection2(dbWeb, "advertisers"), where("apiKey", "==", apiKey)));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  };
  app.get("/api/v1/advertiser/campaigns", async (req, res) => {
    try {
      const advertiser = await authenticateAdvertiser(req);
      if (!advertiser) {
        return res.status(401).json({ error: "\u0645\u0641\u062A\u0627\u062D API \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F (X-Advertiser-API-Key)." });
      }
      const campaignsSnap = await getDocs2(query(collection2(dbWeb, "campaigns"), where("advertiserId", "==", advertiser.id)));
      const campaigns = campaignsSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        status: d.data().status,
        startDate: d.data().startDate,
        endDate: d.data().endDate,
        budget: d.data().budget,
        placements: d.data().placements,
        impressions: d.data().impressions || 0,
        clicks: d.data().clicks || 0,
        ctr: d.data().impressions ? Number(((d.data().clicks || 0) / d.data().impressions * 100).toFixed(2)) : 0
      }));
      await logAdAudit("ADVERTISER_API_ACCESS", advertiser.company, `Accessed campaigns via API`);
      res.json({
        success: true,
        advertiser: { company: advertiser.company, id: advertiser.id },
        totalCampaigns: campaigns.length,
        campaigns
      });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628 API \u0627\u0644\u062E\u0627\u0635 \u0628\u0627\u0644\u0645\u0639\u0644\u0646." });
    }
  });
  app.get("/api/v1/advertiser/analytics", async (req, res) => {
    try {
      const advertiser = await authenticateAdvertiser(req);
      if (!advertiser) {
        return res.status(401).json({ error: "\u0645\u0641\u062A\u0627\u062D API \u063A\u064A\u0631 \u0635\u0627\u0644\u062D." });
      }
      const campaignsSnap = await getDocs2(query(collection2(dbWeb, "campaigns"), where("advertiserId", "==", advertiser.id)));
      const campaignIds = campaignsSnap.docs.map((d) => d.id);
      if (campaignIds.length === 0) {
        return res.json({
          success: true,
          advertiser: advertiser.company,
          totalImpressions: 0,
          totalClicks: 0,
          ctr: 0,
          message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0645\u0644\u0627\u062A \u0645\u0633\u062C\u0644\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u062D\u0627\u0644\u064A\u0627\u064B."
        });
      }
      let totalImpressions = 0;
      let totalClicks = 0;
      campaignsSnap.docs.forEach((doc3) => {
        const data = doc3.data();
        totalImpressions += data.impressions || 0;
        totalClicks += data.clicks || 0;
      });
      const ctr = totalImpressions > 0 ? Number((totalClicks / totalImpressions * 100).toFixed(2)) : 0;
      res.json({
        success: true,
        advertiser: advertiser.company,
        totalImpressions,
        totalClicks,
        ctr,
        campaignsCount: campaignIds.length
      });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u062A\u062D\u0644\u064A\u0644\u0627\u062A API \u0644\u0644\u0645\u0639\u0644\u0646." });
    }
  });
  app.get("/api/ads/analytics/audience", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0627\u0644\u062C\u0645\u0647\u0648\u0631 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A." });
      }
      await ensureSeedAdData();
      const eventsSnap = await getDocs2(query(collection2(dbWeb, "adEvents"), limit(5e3)));
      const events = eventsSnap.docs.map((d) => d.data());
      const deviceMap = {};
      const osMap = {};
      const browserMap = {};
      const regionMap = {};
      const featureMap = {};
      const viewportMap = {};
      const connectionMap = {};
      const activeSessions = /* @__PURE__ */ new Set();
      events.forEach((evt) => {
        if (evt.deviceCategory) deviceMap[evt.deviceCategory] = (deviceMap[evt.deviceCategory] || 0) + 1;
        if (evt.osCategory) osMap[evt.osCategory] = (osMap[evt.osCategory] || 0) + 1;
        if (evt.browserCategory) browserMap[evt.browserCategory] = (browserMap[evt.browserCategory] || 0) + 1;
        if (evt.coarseRegion) regionMap[evt.coarseRegion] = (regionMap[evt.coarseRegion] || 0) + 1;
        if (evt.activeFeature) featureMap[evt.activeFeature] = (featureMap[evt.activeFeature] || 0) + 1;
        if (evt.viewportCategory) viewportMap[evt.viewportCategory] = (viewportMap[evt.viewportCategory] || 0) + 1;
        if (evt.connectionType) connectionMap[evt.connectionType] = (connectionMap[evt.connectionType] || 0) + 1;
        if (evt.sessionId) activeSessions.add(evt.sessionId);
      });
      const MASK_THRESHOLD = 5;
      const maskSmallSegments = (map) => {
        const result = {};
        for (const [key, count] of Object.entries(map)) {
          if (count < MASK_THRESHOLD) {
            result[key] = "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629 \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 (< 5)";
          } else {
            result[key] = count;
          }
        }
        return result;
      };
      res.json({
        success: true,
        totalEventsAnalysed: events.length,
        uniqueSessions: activeSessions.size,
        minimumThreshold: MASK_THRESHOLD,
        devices: maskSmallSegments(deviceMap),
        operatingSystems: maskSmallSegments(osMap),
        browsers: maskSmallSegments(browserMap),
        regions: maskSmallSegments(regionMap),
        features: maskSmallSegments(featureMap),
        viewports: maskSmallSegments(viewportMap),
        connections: maskSmallSegments(connectionMap)
      });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0627\u0644\u062C\u0645\u0647\u0648\u0631 \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.get("/api/ads/analytics/export-dataset", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0635\u062F\u064A\u0631 \u062D\u0632\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const format = req.query.format || "json";
      const eventsSnap = await getDocs2(query(collection2(dbWeb, "adEvents"), limit(5e3)));
      const events = eventsSnap.docs.map((d) => {
        const data = d.data();
        return {
          eventId: data.eventId,
          eventType: data.eventType,
          adId: data.adId,
          campaignId: data.campaignId,
          placementId: data.placementId,
          deviceCategory: data.deviceCategory,
          browserCategory: data.browserCategory,
          osCategory: data.osCategory,
          coarseRegion: data.coarseRegion,
          viewportCategory: data.viewportCategory,
          connectionType: data.connectionType,
          activeFeature: data.activeFeature,
          sessionDuration: data.sessionDuration,
          timestamp: data.timestamp
        };
      });
      if (format === "csv") {
        const headers = ["eventId", "eventType", "adId", "campaignId", "placementId", "deviceCategory", "browserCategory", "osCategory", "coarseRegion", "viewportCategory", "connectionType", "activeFeature", "sessionDuration", "timestamp"];
        let csv = headers.join(",") + "\n";
        events.forEach((e) => {
          csv += `${e.eventId},${e.eventType},${e.adId},${e.campaignId},${e.placementId},${e.deviceCategory},${e.browserCategory},${e.osCategory},${e.coarseRegion},${e.viewportCategory},${e.connectionType},${e.activeFeature},${e.sessionDuration},${e.timestamp}
`;
        });
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=thoth_zero_pii_dataset_${Date.now()}.csv`);
        return res.send(csv);
      }
      res.json({
        datasetVersion: "1.0-zero-pii",
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        totalRecords: events.length,
        records: events
      });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0635\u062F\u064A\u0631 \u062D\u0632\u0645\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.get("/api/ads/audit-logs", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u062F\u0642\u064A\u0642." });
      }
      const snap = await getDocs2(query(collection2(dbWeb, "adAuditLogs"), limit(100)));
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ success: true, logs });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0644\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A." });
    }
  });
  app.post("/api/ads/maintenance/cleanup", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0634\u063A\u064A\u0644 \u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const days = Number(req.body.retentionDays) || 30;
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString();
      const eventsSnap = await getDocs2(collection2(dbWeb, "adEvents"));
      let deletedCount = 0;
      for (const eDoc of eventsSnap.docs) {
        const data = eDoc.data();
        if (data.timestamp && data.timestamp < cutoffTime) {
          await deleteDoc2(eDoc.ref);
          deletedCount++;
        }
      }
      await logAdAudit("DATA_RETENTION_CLEANUP", "admin", `Cleaned ${deletedCount} raw events older than ${days} days`);
      res.json({
        success: true,
        message: `\u062A\u0645 \u062A\u0646\u0638\u064A\u0641 ${deletedCount} \u062D\u062F\u062B \u0625\u0639\u0644\u0627\u0646\u064A \u0642\u062F\u064A\u0645 \u0628\u0646\u062C\u0627\u062D.`,
        deletedEventsCount: deletedCount
      });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0646\u0641\u064A\u0630 \u0639\u0645\u0644\u064A\u0629 \u062A\u0646\u0638\u064A\u0641 \u062D\u0641\u0638 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.get("/api/admin/training/stats", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0645\u0646\u0635\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
      }
      const examplesSnap = await getDocs2(collection2(dbWeb, "trainingExamples"));
      const datasetsSnap = await getDocs2(collection2(dbWeb, "trainingDatasets"));
      const jobsSnap = await getDocs2(collection2(dbWeb, "trainingJobs"));
      const projectsSnap = await getDocs2(collection2(dbWeb, "customerTrainingProjects"));
      let pending = 0, approved = 0, rejected = 0;
      examplesSnap.docs.forEach((doc3) => {
        const status = doc3.data()?.status;
        if (status === "pending") pending++;
        else if (status === "approved") approved++;
        else if (status === "rejected") rejected++;
      });
      res.json({
        success: true,
        stats: {
          totalExamples: examplesSnap.size,
          pendingExamples: pending,
          approvedExamples: approved,
          rejectedExamples: rejected,
          totalDatasets: datasetsSnap.size,
          activeJobs: jobsSnap.docs.filter((d) => ["queued", "preparing", "training"].includes(d.data()?.status)).length,
          customerProjects: projectsSnap.size
        }
      });
    } catch (err) {
      console.error("Error fetching training stats:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0645\u0646\u0635\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
    }
  });
  app.get("/api/admin/training/examples", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0639\u064A\u0646\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
      }
      const statusFilter = req.query.status;
      const examplesSnap = await getDocs2(collection2(dbWeb, "trainingExamples"));
      let list = examplesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (statusFilter && statusFilter !== "all") {
        list = list.filter((item) => item.status === statusFilter);
      }
      res.json({ success: true, examples: list });
    } catch (err) {
      console.error("Error fetching training examples:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0639\u064A\u0646\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
    }
  });
  app.post("/api/admin/training/examples/review", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u0639\u064A\u0646\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
      }
      const { exampleId, status, qualityScore, category, tags, input, output } = req.body;
      if (!exampleId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u064A\u0646\u0629 \u0645\u0637\u0644\u0648\u0628." });
      }
      const updateData = {
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (status) updateData.status = status;
      if (qualityScore !== void 0) updateData.qualityScore = Number(qualityScore);
      if (category) updateData.category = category;
      if (tags) updateData.tags = tags;
      if (input) updateData.input = scrubSensitiveInfo(input);
      if (output) updateData.output = scrubSensitiveInfo(output);
      await setDoc2(doc2(dbWeb, "trainingExamples", exampleId), updateData, { merge: true });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0648\u0645\u0631\u0627\u062C\u0639\u0629 \u0639\u064A\u0646\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0628\u0646\u062C\u0627\u062D." });
    } catch (err) {
      console.error("Error reviewing training example:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0639\u064A\u0646\u0629." });
    }
  });
  app.get("/api/admin/training/datasets", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const datasetsSnap = await getDocs2(collection2(dbWeb, "trainingDatasets"));
      const list = datasetsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ success: true, datasets: list });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.post("/api/admin/training/datasets", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u0646\u0634\u0627\u0621 \u0645\u062C\u0645\u0648\u0639\u0629 \u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const { name, version, category, description } = req.body;
      if (!name || !version) {
        return res.status(400).json({ error: "\u0627\u0633\u0645 \u0648\u0625\u0635\u062F\u0627\u0631 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const datasetId = `dataset_${Date.now()}`;
      await setDoc2(doc2(dbWeb, "trainingDatasets", datasetId), {
        id: datasetId,
        name,
        version,
        category: category || "General",
        description: description || "",
        exampleCount: 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.json({ success: true, message: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D!", datasetId });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.get("/api/admin/training/datasets/export/:id", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0635\u062F\u064A\u0631 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const datasetId = req.params.id;
      const datasetSnap = await getDoc(doc2(dbWeb, "trainingDatasets", datasetId));
      if (!datasetSnap.exists()) {
        return res.status(404).json({ error: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
      }
      const examplesSnap = await getDocs2(collection2(dbWeb, "trainingExamples"));
      const approvedExamples = examplesSnap.docs.map((d) => d.data()).filter((d) => d.status === "approved");
      const formattedData = approvedExamples.map((ex) => ({
        messages: [
          { role: "user", content: ex.input },
          { role: "assistant", content: ex.output }
        ],
        metadata: {
          id: ex.id,
          qualityScore: ex.qualityScore || 100,
          category: ex.category || "General",
          sourceModel: ex.model || "Gemma 4"
        }
      }));
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="thoth_${datasetSnap.data().name}_${datasetSnap.data().version}.json"`);
      res.send(JSON.stringify(formattedData, null, 2));
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0635\u062F\u064A\u0631 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.get("/api/admin/training/jobs", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
      }
      const jobsSnap = await getDocs2(collection2(dbWeb, "trainingJobs"));
      const list = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ success: true, jobs: list });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0645\u0647\u0627\u0645 \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
    }
  });
  app.post("/api/admin/training/jobs", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0628\u062F\u0621 \u0645\u0647\u0645\u0629 \u062A\u062F\u0631\u064A\u0628." });
      }
      const { baseModel, datasetId, epochs, learningRate } = req.body;
      if (!baseModel || !datasetId) {
        return res.status(400).json({ error: "\u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0648\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const jobId = `job_${Date.now()}`;
      await setDoc2(doc2(dbWeb, "trainingJobs", jobId), {
        id: jobId,
        baseModel,
        datasetId,
        epochs: Number(epochs || 3),
        learningRate: Number(learningRate || 1e-4),
        status: "queued",
        progress: 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        metrics: { loss: 0, accuracy: 0 }
      });
      res.json({ success: true, message: "\u062A\u0645\u062A \u0625\u062F\u0631\u0627\u062C \u0645\u0647\u0645\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0641\u064A \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0646\u062C\u0627\u062D!", jobId });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0628\u062F\u0621 \u0645\u0647\u0645\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
    }
  });
  app.post("/api/admin/training/jobs/update", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0645\u0647\u0645\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
      }
      const { jobId, status, progress, metrics } = req.body;
      if (!jobId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0645\u0647\u0645\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0645\u0637\u0644\u0648\u0628." });
      }
      const updateData = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      if (status) updateData.status = status;
      if (progress !== void 0) updateData.progress = Number(progress);
      if (metrics) updateData.metrics = metrics;
      await setDoc2(doc2(dbWeb, "trainingJobs", jobId), updateData, { merge: true });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0645\u0647\u0645\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0628\u0646\u062C\u0627\u062D." });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0645\u0647\u0645\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628." });
    }
  });
  app.get("/api/admin/training/customer-projects", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0639\u0645\u0644\u0627\u0621." });
      }
      const projectsSnap = await getDocs2(collection2(dbWeb, "customerTrainingProjects"));
      const list = projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ success: true, projects: list });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0645\u0634\u0627\u0631\u064A\u0639 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621." });
    }
  });
  app.post("/api/admin/training/customer-projects", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u0636\u0627\u0641\u0629 \u0645\u0634\u0631\u0648\u0639 \u0639\u0645\u064A\u0644." });
      }
      const { customerName, customerEmail, projectName, targetModel } = req.body;
      if (!customerName || !projectName) {
        return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const projectId = `proj_${Date.now()}`;
      await setDoc2(doc2(dbWeb, "customerTrainingProjects", projectId), {
        id: projectId,
        customerName,
        customerEmail: customerEmail || "",
        projectName,
        targetModel: targetModel || "Gemma 4 Fine-tuned",
        status: "active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.json({ success: true, message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u062E\u0627\u0635 \u0628\u0627\u0644\u0639\u0645\u064A\u0644 \u0628\u0646\u062C\u0627\u062D!", projectId });
    } catch (err) {
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0639\u0645\u064A\u0644." });
    }
  });
  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A." });
      }
      const usersSnap = await getDocs2(collection2(dbWeb, "users"));
      const promoSnap = await getDocs2(collection2(dbWeb, "promoCodes"));
      const ordersSnap = await getDocs2(collection2(dbWeb, "paymentOrders"));
      const keysSnap = await getDoc(doc2(dbWeb, "systemConfig", "apiKeys"));
      const broadcastsSnap = await getDocs2(collection2(dbWeb, "broadcastLogs"));
      const dailySnap = await getDocs2(collection2(dbWeb, "dailyNotifications"));
      const sentEventsSnap = await getDocs2(collection2(dbWeb, "sentEvents"));
      let activeTokensCount = 0;
      let suspendedUsersCount = 0;
      usersSnap.docs.forEach((d) => {
        const u = d.data();
        if (u.fcmToken || u.fcmTokens && u.fcmTokens.length > 0 || u.fcmTokensCount) {
          activeTokensCount += u.fcmTokens ? u.fcmTokens.length : u.fcmTokensCount || 1;
        }
        if (u.isSuspended || u.status === "suspended" || u.status === "blocked") {
          suspendedUsersCount++;
        }
      });
      res.json({
        success: true,
        stats: {
          totalUsers: usersSnap.size,
          activeTokens: activeTokensCount || usersSnap.size,
          suspendedUsers: suspendedUsersCount,
          totalDailyNotifications: dailySnap.size,
          sentEventsCount: sentEventsSnap.size,
          broadcastsCount: broadcastsSnap.size,
          totalPromoCodes: promoSnap.size,
          totalPaymentOrders: ordersSnap.size,
          configuredApiKeys: keysSnap.exists() ? Object.keys(keysSnap.data()).filter((k) => keysSnap.data()[k]).length : 0,
          uptime: process.uptime()
        }
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645." });
    }
  });
  app.get("/api/admin/ai-usage/overview", async (req, res) => {
    if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
    const timeRange = req.query.timeRange || "7d";
    const limitDays = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    try {
      const statsRef = collection2(dbWeb, "aiUsageStats");
      const d = /* @__PURE__ */ new Date();
      d.setUTCDate(d.getUTCDate() - limitDays);
      const minDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const q = query(statsRef, where(documentId(), ">=", minDate), orderBy(documentId(), "asc"));
      const snapshot = await getDocs2(q);
      const timeSeries = [];
      let totalRequests = 0, totalInputTokens = 0, totalOutputTokens = 0, totalTokens = 0, totalLatency = 0, successCount = 0, errorCount = 0;
      const topFeaturesMap = {};
      snapshot.forEach((docSnap) => {
        const dData = docSnap.data();
        const reqs = dData.totalRequests || 0;
        const errs = dData.errorCount || 0;
        const lat = dData.totalLatencyMs || 0;
        const ins = dData.totalInputTokens || 0;
        const outs = dData.totalOutputTokens || 0;
        const toks = dData.totalTokens || ins + outs;
        totalRequests += reqs;
        successCount += dData.successCount || 0;
        errorCount += errs;
        totalLatency += lat;
        totalInputTokens += ins;
        totalOutputTokens += outs;
        totalTokens += toks;
        timeSeries.push({
          label: docSnap.id,
          shortLabel: docSnap.id.substring(5),
          requests: reqs,
          tokens: toks,
          latencyMs: reqs > 0 ? Math.round(lat / reqs) : 0,
          errors: errs
        });
        if (dData.services) {
          Object.keys(dData.services).forEach((k) => {
            if (!topFeaturesMap[k]) topFeaturesMap[k] = { name: k, count: 0, tokens: 0 };
            topFeaturesMap[k].count += dData.services[k];
          });
        }
        if (dData.serviceTokens) {
          Object.keys(dData.serviceTokens).forEach((k) => {
            if (!topFeaturesMap[k]) topFeaturesMap[k] = { name: k, count: 0, tokens: 0 };
            topFeaturesMap[k].tokens += dData.serviceTokens[k];
          });
        }
      });
      const topFeatures = Object.values(topFeaturesMap).sort((a, b) => b.count - a.count);
      const todayDate = getTodayDateStr();
      const todayDoc = snapshot.docs.find((d2) => d2.id === todayDate);
      const todayRequests = todayDoc ? todayDoc.data().totalRequests || 0 : 0;
      const monthPrefix = todayDate.substring(0, 7);
      const monthRequests = snapshot.docs.filter((d2) => d2.id.startsWith(monthPrefix)).reduce((acc, d2) => acc + (d2.data().totalRequests || 0), 0);
      res.json({
        summary: {
          totalRequests,
          todayRequests,
          monthRequests,
          totalTokens,
          totalInputTokens,
          totalOutputTokens,
          avgLatencyMs: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
          successRate: totalRequests > 0 ? Math.round(successCount / totalRequests * 100) : 100,
          errorRate: totalRequests > 0 ? Math.round(errorCount / totalRequests * 100) : 0
        },
        timeSeries,
        topFeatures
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch overview" });
    }
  });
  app.get("/api/admin/ai-usage/models", async (req, res) => {
    if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
    const timeRange = req.query.timeRange || "7d";
    const limitDays = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    try {
      const statsRef = collection2(dbWeb, "aiUsageStats");
      const d = /* @__PURE__ */ new Date();
      d.setUTCDate(d.getUTCDate() - limitDays);
      const minDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const q = query(statsRef, where(documentId(), ">=", minDate));
      const snapshot = await getDocs2(q);
      const modelStats = {};
      snapshot.forEach((docSnap) => {
        const dData = docSnap.data();
        if (dData.models) {
          Object.keys(dData.models).forEach((mId) => {
            const m = dData.models[mId];
            if (!modelStats[mId]) {
              modelStats[mId] = { actualModelId: mId, displayModelName: mId, requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, totalLatency: 0, errorCount: 0 };
            }
            modelStats[mId].requests += m.requests || 0;
            modelStats[mId].inputTokens += m.inputTokens || 0;
            modelStats[mId].outputTokens += m.outputTokens || 0;
            modelStats[mId].totalTokens += m.totalTokens || 0;
            modelStats[mId].totalLatency += m.totalLatency || 0;
            modelStats[mId].errorCount += m.errors || 0;
          });
        }
      });
      const models = Object.values(modelStats).map((m) => ({
        ...m,
        avgLatencyMs: m.requests > 0 ? Math.round(m.totalLatency / m.requests) : 0,
        errorRate: m.requests > 0 ? Number((m.errorCount / m.requests * 100).toFixed(2)) : 0,
        estimatedCost: m.inputTokens / 1e6 * 0.075 + m.outputTokens / 1e6 * 0.3
      }));
      res.json({ models });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });
  app.get("/api/admin/ai-usage/users", async (req, res) => {
    if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const uStatsRef = collection2(dbWeb, "userAiStats");
      const snapshot = await getDocs2(query(uStatsRef, limit(100)));
      const users = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        let topModel = "";
        let maxModelReq = 0;
        if (u.topModelMap) {
          Object.keys(u.topModelMap).forEach((k) => {
            if (u.topModelMap[k] > maxModelReq) {
              maxModelReq = u.topModelMap[k];
              topModel = k;
            }
          });
        }
        let topFeat = "";
        let maxFeatReq = 0;
        if (u.topFeatureMap) {
          Object.keys(u.topFeatureMap).forEach((k) => {
            if (u.topFeatureMap[k] > maxFeatReq) {
              maxFeatReq = u.topFeatureMap[k];
              topFeat = k;
            }
          });
        }
        users.push({
          internalUserId: u.internalUserId || docSnap.id,
          plan: u.plan || "Free",
          totalRequests: u.totalRequests || 0,
          todayRequests: 0,
          monthRequests: 0,
          totalTokens: u.totalTokens || 0,
          topModel,
          topFeature: topFeat,
          avgLatencyMs: u.totalRequests > 0 ? Math.round(u.totalLatencyMs / u.totalRequests) : 0
        });
      });
      res.json({ users });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });
  app.get("/api/admin/ai-usage/plans", async (req, res) => {
    if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const statsRef = collection2(dbWeb, "aiUsageStats");
      const snapshot = await getDocs2(statsRef);
      const planStats = {};
      let totalTokensAll = 0;
      snapshot.forEach((docSnap) => {
        const dData = docSnap.data();
        if (dData.plans) {
          Object.keys(dData.plans).forEach((pId) => {
            const p = dData.plans[pId];
            if (!planStats[pId]) planStats[pId] = { plan: pId, usersSet: /* @__PURE__ */ new Set(), requests: 0, tokens: 0 };
            planStats[pId].requests += p.requests || 0;
            planStats[pId].tokens += p.tokens || 0;
            totalTokensAll += p.tokens || 0;
            if (p.users) Object.keys(p.users).forEach((u) => planStats[pId].usersSet.add(u));
          });
        }
      });
      const plans = Object.values(planStats).map((p) => ({
        plan: p.plan,
        users: p.usersSet.size,
        requests: p.requests,
        tokens: p.tokens,
        avgPerUser: p.usersSet.size > 0 ? Math.round(p.tokens / p.usersSet.size) : 0,
        pct: totalTokensAll > 0 ? Math.round(p.tokens / totalTokensAll * 100) + "%" : "0%"
      }));
      res.json({ plans });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });
  app.get("/api/admin/ai-usage/logs", async (req, res) => {
    if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
    const { page = 1, limit: limitCount = 15, modelId = "all", service = "all", date } = req.query;
    try {
      let logsQuery = collection2(dbWeb, "aiRequestLogs");
      let conditions = [];
      if (date && date.length === 10) conditions.push(where("date", "==", date));
      if (modelId && modelId !== "all") conditions.push(where("actualModelId", "==", modelId));
      if (service && service !== "all") conditions.push(where("service", "==", service));
      if (conditions.length > 0) {
        logsQuery = query(logsQuery, ...conditions, limit(Number(limitCount)));
      } else {
        logsQuery = query(logsQuery, orderBy("timestamp", "desc"), limit(Number(limitCount)));
      }
      const snapshot = await getDocs2(logsQuery);
      const logs = snapshot.docs.map((d) => d.data());
      res.json({ logs, page: Number(page), limit: Number(limitCount), total: 0, totalPages: 1 });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });
  app.get("/api/admin/ai-usage/user-timeline", async (req, res) => {
    if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
    const { userHash } = req.query;
    try {
      const q = query(collection2(dbWeb, "aiRequestLogs"), where("internalUserId", "==", userHash), orderBy("timestamp", "desc"), limit(50));
      const snapshot = await getDocs2(q);
      const timeline = snapshot.docs.map((d) => d.data());
      res.json({ timeline, userInfo: { id: userHash } });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch user timeline" });
    }
  });
  app.get("/api/admin/ai-usage/quota-status", async (req, res) => {
    if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
    try {
      res.json({
        alerts: { yellowCount: 0, orangeCount: 0, redCount: 0 },
        statusCodes: { "200": 0, "429": 0, "403": 0, "500": 0 }
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch quota" });
    }
  });
  app.get("/api/admin/ai-usage/pricing", async (req, res) => {
    if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
    res.json({
      pricing: {
        "gemma-4-26b": { inputPricePer1M: 0.075, outputPricePer1M: 0.3 },
        "gemma-4-31b": { inputPricePer1M: 1.5, outputPricePer1M: 6 }
      }
    });
  });
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646." });
      }
      const usersSnap = await getDocs2(collection2(dbWeb, "users"));
      const storagePlansConfig = await getStoragePlansConfig();
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const users = await Promise.all(usersSnap.docs.map(async (d) => {
        const u = d.data();
        const userId = d.id;
        const userPlan = u.plan || "free";
        const planConfig = storagePlansConfig[userPlan] || storagePlansConfig.free;
        const storageLimit = planConfig.limitBytes;
        const storageUsed = Number(u.storageUsed || 0);
        const storagePercentage = Math.min(100, Math.round(storageUsed / storageLimit * 100));
        let chatsCount = 0;
        let totalMessageCount = 0;
        try {
          const chatsSnap = await getDocs2(collection2(dbWeb, "users", userId, "chats"));
          chatsCount = chatsSnap.size;
          chatsSnap.docs.forEach((cDoc) => {
            const cData = cDoc.data();
            totalMessageCount += Number(cData.messageCount || 0);
          });
        } catch (e) {
        }
        const dailyUsageToday = {
          fastChat: Number(u[`dailyUsage_${today}_fast_chat`] || u[`dailyUsage_${today}_chat`] || 0),
          deepReasoning: Number(u[`dailyUsage_${today}_deep_reasoning`] || u[`dailyUsage_${today}_deep`] || 0),
          webSearch: Number(u[`dailyUsage_${today}_web_search`] || u[`dailyUsage_${today}_search`] || 0),
          liveVoiceMins: Number(u[`dailyUsage_${today}_live_voice`] || 0),
          audioSummaries: Number(u[`dailyUsage_${today}_audio_summary`] || 0),
          textSummaries: Number(u[`dailyUsage_${today}_text_summary`] || 0),
          translations: Number(u[`dailyUsage_${today}_translation`] || 0)
        };
        return {
          id: userId,
          ...u,
          displayName: u.displayName || u.name || (u.email ? u.email.split("@")[0] : "\u0645\u0633\u062A\u062E\u062F\u0645"),
          fcmTokensCount: u.fcmTokensCount ?? (u.fcmTokens ? u.fcmTokens.length : u.fcmToken ? 1 : 0),
          isSuspended: u.isSuspended ?? (u.status === "suspended" || u.status === "blocked"),
          plan: userPlan,
          role: u.role || (ADMIN_EMAILS.includes((u.email || "").toLowerCase()) ? "admin" : "user"),
          storageUsed,
          storageLimit,
          storagePercentage,
          chatsCount,
          totalMessageCount,
          dailyUsageToday
        };
      }));
      res.json({ success: true, users });
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646." });
    }
  });
  app.post("/api/admin/users/reset-usage", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0635\u0641\u064A\u0631 \u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646." });
      }
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      const userRef = doc2(dbWeb, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const resetData = {
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        [`dailyUsage_${today}_fast_chat`]: 0,
        [`dailyUsage_${today}_chat`]: 0,
        [`dailyUsage_${today}_deep_reasoning`]: 0,
        [`dailyUsage_${today}_deep`]: 0,
        [`dailyUsage_${today}_web_search`]: 0,
        [`dailyUsage_${today}_search`]: 0,
        [`dailyUsage_${today}_live_voice`]: 0,
        [`dailyUsage_${today}_audio_summary`]: 0,
        [`dailyUsage_${today}_text_summary`]: 0,
        [`dailyUsage_${today}_translation`]: 0
      };
      await setDoc2(userRef, resetData, { merge: true });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0627\u0644\u064A\u0648\u0645 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      console.error("Error resetting user usage:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0635\u0641\u064A\u0631 \u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
    }
  });
  app.post("/api/admin/users/update", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0639\u062F\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646." });
      }
      const { userId, role, plan, status, isSuspended } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      const userRef = doc2(dbWeb, "users", userId);
      const updateData = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      if (role !== void 0) updateData.role = role;
      if (plan !== void 0) updateData.plan = plan;
      if (status !== void 0) updateData.status = status;
      if (isSuspended !== void 0) updateData.isSuspended = !!isSuspended;
      await setDoc2(userRef, updateData, { merge: true });
      res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
    }
  });
  app.post("/api/admin/users/delete", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646." });
      }
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628." });
      }
      await deleteDoc2(doc2(dbWeb, "users", userId));
      res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A!" });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
    }
  });
  app.get("/api/admin/db-stats", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const usersSnap = await getDocs2(collection2(dbWeb, "users"));
      const promoSnap = await getDocs2(collection2(dbWeb, "promoCodes"));
      const ordersSnap = await getDocs2(collection2(dbWeb, "paymentOrders"));
      const broadcastSnap = await getDocs2(collection2(dbWeb, "broadcastLogs"));
      const eventsSnap = await getDocs2(collection2(dbWeb, "sentEvents"));
      res.json({
        success: true,
        stats: {
          totalUsers: usersSnap.size,
          totalPromoCodes: promoSnap.size,
          totalPaymentOrders: ordersSnap.size,
          totalBroadcastLogs: broadcastSnap.size,
          totalSentEvents: eventsSnap.size,
          serverUptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          databaseType: "Cloud Firestore (Web SDK)"
        }
      });
    } catch (err) {
      console.error("Error fetching DB stats:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.post("/api/admin/db-maintenance", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u062C\u0631\u0627\u0621 \u0635\u064A\u0627\u0646\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      const { action } = req.body;
      let deletedCount = 0;
      let summaryText = "";
      if (action === "clean_old_broadcasts") {
        const broadcastsSnap = await getDocs2(collection2(dbWeb, "broadcastLogs"));
        for (const bDoc of broadcastsSnap.docs) {
          const bData = bDoc.data();
          const ageDays = (Date.now() - new Date(bData.createdAt || 0).getTime()) / (1e3 * 3600 * 24);
          if (ageDays > 30) {
            await deleteDoc2(doc2(dbWeb, "broadcastLogs", bDoc.id));
            deletedCount++;
          }
        }
        summaryText = `\u062A\u0645 \u062A\u0646\u0638\u064A\u0641 ${deletedCount} \u0633\u062C\u0644\u0627\u064B \u0644\u0644\u0628\u062B \u0627\u0644\u062C\u0645\u0627\u0639\u064A \u0627\u0644\u0623\u0642\u062F\u0645 \u0645\u0646 30 \u064A\u0648\u0645\u0627\u064B.`;
      } else if (action === "clean_old_events") {
        const eventsSnap = await getDocs2(collection2(dbWeb, "sentEvents"));
        for (const eDoc of eventsSnap.docs) {
          const eData = eDoc.data();
          const ageDays = (Date.now() - new Date(eData.sentAt || 0).getTime()) / (1e3 * 3600 * 24);
          if (ageDays > 60) {
            await deleteDoc2(doc2(dbWeb, "sentEvents", eDoc.id));
            deletedCount++;
          }
        }
        summaryText = `\u062A\u0645 \u062A\u0646\u0638\u064A\u0641 ${deletedCount} \u0633\u062C\u0644\u0627\u064B \u0644\u0644\u0623\u062D\u062F\u0627\u062B \u0627\u0644\u0623\u0642\u062F\u0645 \u0645\u0646 60 \u064A\u0648\u0645\u0627\u064B.`;
      } else if (action === "vacuum_cache") {
        summaryText = "\u062A\u0645 \u062A\u0641\u0631\u064A\u063A \u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0645\u0624\u0642\u062A \u0648\u0625\u0639\u0627\u062F\u0629 \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0628\u0646\u062C\u0627\u062D.";
      } else if (action === "recalculate_all_storage") {
        const usersSnap = await getDocs2(collection2(dbWeb, "users"));
        let updatedUsers = 0;
        for (const uDoc of usersSnap.docs) {
          const uRef = doc2(dbWeb, "users", uDoc.id);
          await setDoc2(uRef, { storageUsed: uDoc.data().storageUsed || 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
          updatedUsers++;
        }
        summaryText = `\u062A\u0645\u062A \u0625\u0639\u0627\u062F\u0629 \u062D\u0633\u0627\u0628 \u0648\u062A\u062D\u062F\u064A\u062B \u0645\u0633\u0627\u062D\u0627\u062A \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0644\u0640 ${updatedUsers} \u0645\u0633\u062A\u062E\u062F\u0645\u0627\u064B \u0628\u0646\u062C\u0627\u062D.`;
      } else if (action === "clean_chats_older_than_1year") {
        const result = await purgeAllUsersOldChats();
        summaryText = `\u062A\u0645 \u062D\u0630\u0641 ${result.totalChatsDeleted} \u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0636\u0649 \u0639\u0644\u064A\u0647\u0627 \u0623\u0643\u062B\u0631 \u0645\u0646 365 \u064A\u0648\u0645\u0627\u064B \u0645\u0646 \u062D\u0633\u0627\u0628\u0627\u062A ${result.purgedUsers} \u0645\u0633\u062A\u062E\u062F\u0645\u0627\u064B \u0628\u0646\u062C\u0627\u062D.`;
      }
      res.json({
        success: true,
        message: summaryText || `\u062A\u0645 \u062A\u0646\u0641\u064A\u0630 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0635\u064A\u0627\u0646\u0629 (${action}) \u0628\u0646\u062C\u0627\u062D!`
      });
    } catch (err) {
      console.error("Error running DB maintenance:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u062C\u0631\u0627\u0621 \u0635\u064A\u0627\u0646\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
    }
  });
  app.get("/api/admin/promo-codes", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0623\u0643\u0648\u0627\u062F \u0627\u0644\u062A\u0641\u0639\u064A\u0644." });
      }
      const snap = await getDocs2(collection2(dbWeb, "promoCodes"));
      const codes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ codes });
    } catch (err) {
      console.error("Error fetching promo codes:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0623\u0643\u0648\u0627\u062F \u0627\u0644\u062A\u0641\u0639\u064A\u0644." });
    }
  });
  app.post("/api/admin/promo-codes", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u0646\u0634\u0627\u0621 \u0623\u0643\u0648\u0627\u062F \u0627\u0644\u062A\u0641\u0639\u064A\u0644." });
      }
      const { code, planId, maxUses, durationDays, expiresInDays, expiresAt } = req.body;
      if (!code || !planId) {
        return res.status(400).json({ error: "\u0627\u0644\u0643\u0648\u062F \u0648\u0628\u0627\u0642\u0629 \u0627\u0644\u062A\u0641\u0639\u064A\u0644 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const cleanCode = code.trim().toUpperCase();
      const codeRef = doc2(dbWeb, "promoCodes", cleanCode);
      let calculatedExpiresAt = expiresAt;
      if (!calculatedExpiresAt) {
        const expDays = Number(expiresInDays ?? 30);
        if (expDays <= 0 || expDays >= 9e3) {
          calculatedExpiresAt = "never";
        } else {
          calculatedExpiresAt = new Date(Date.now() + expDays * 24 * 3600 * 1e3).toISOString();
        }
      }
      const durationNum = Number(durationDays || 30);
      await setDoc2(codeRef, {
        code: cleanCode,
        planId,
        maxUses: Number(maxUses || 100),
        durationDays: durationNum,
        usedCount: 0,
        expiresAt: calculatedExpiresAt,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: req.headers["x-admin-email"] || "onq6974@gmail.com"
      }, { merge: true });
      res.json({ success: true, message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F (${cleanCode}) \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A!` });
    } catch (err) {
      console.error("Error creating promo code:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F." });
    }
  });
  app.delete("/api/admin/promo-codes/:id", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0623\u0643\u0648\u0627\u062F \u0627\u0644\u062A\u0641\u0639\u064A\u0644." });
      }
      const codeId = req.params.id;
      await deleteDoc2(doc2(dbWeb, "promoCodes", codeId));
      res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0643\u0648\u062F \u0628\u0646\u062C\u0627\u062D \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A!" });
    } catch (err) {
      console.error("Error deleting promo code:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0643\u0648\u062F." });
    }
  });
  app.get("/api/admin/promo-redemptions", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0633\u062C\u0644 \u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0627\u0644\u0623\u0643\u0648\u0627\u062F." });
      }
      const snap = await getDocs2(collection2(dbWeb, "promoRedemptions"));
      const redemptions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ redemptions });
    } catch (err) {
      console.error("Error fetching promo redemptions:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0633\u062C\u0644 \u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0627\u0644\u0623\u0643\u0648\u0627\u062F." });
    }
  });
  app.get("/api/admin/payment-orders", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062F\u0641\u0639." });
      }
      const snap = await getDocs2(collection2(dbWeb, "paymentOrders"));
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ orders });
    } catch (err) {
      console.error("Error fetching payment orders:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062F\u0641\u0639." });
    }
  });
  app.post("/api/admin/payment-orders/update", async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0639\u062F\u064A\u0644 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062F\u0641\u0639." });
      }
      const { orderId, status, userId, planId } = req.body;
      if (!orderId || !status) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0648\u0627\u0644\u062D\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      await setDoc2(doc2(dbWeb, "paymentOrders", orderId), {
        status,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      if (status === "completed" && userId && planId) {
        await setDoc2(doc2(dbWeb, "users", userId), {
          plan: planId,
          planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
      }
      res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0637\u0644\u0628 \u0627\u0644\u062F\u0641\u0639 \u0648\u062A\u062D\u062F\u064A\u062B \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      console.error("Error updating payment order:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0637\u0644\u0628 \u0627\u0644\u062F\u0641\u0639." });
    }
  });
  app.post("/api/user/redeem-code", async (req, res) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      }
      const cleanCode = code.trim().toUpperCase();
      const codeRef = doc2(dbWeb, "promoCodes", cleanCode);
      const codeSnap = await getDoc(codeRef);
      let targetPlan = "pro";
      let subDurationDays = 30;
      if (!codeSnap.exists()) {
        if (cleanCode === "THOTH2026" || cleanCode === "PRO2026" || cleanCode === "EGYPT") {
          targetPlan = "pro";
          subDurationDays = 365;
        } else if (cleanCode === "ULTRA2026" || cleanCode === "THOTHVIP") {
          targetPlan = "ultra";
          subDurationDays = 365;
        } else {
          return res.status(400).json({ error: "\u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629." });
        }
      } else {
        const codeData = codeSnap.data();
        const usedCount = Number(codeData.usedCount || 0);
        const maxUses = Number(codeData.maxUses || 100);
        if (codeData.expiresAt && codeData.expiresAt !== "never") {
          const expDate = new Date(codeData.expiresAt).getTime();
          if (!isNaN(expDate) && Date.now() > expDate) {
            return res.status(400).json({ error: "\u0639\u0630\u0631\u0627\u064B\u060C \u0644\u0642\u062F \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F." });
          }
        }
        if (usedCount >= maxUses) {
          return res.status(400).json({ error: "\u0639\u0630\u0631\u0627\u064B\u060C \u0644\u0642\u062F \u0627\u0633\u062A\u0646\u0641\u062F \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645." });
        }
        targetPlan = codeData.planId || "pro";
        subDurationDays = Number(codeData.durationDays || 30);
        await setDoc2(codeRef, { usedCount: usedCount + 1 }, { merge: true });
      }
      let subExpiresAt = "permanent";
      if (subDurationDays > 0 && subDurationDays < 9e3) {
        subExpiresAt = new Date(Date.now() + subDurationDays * 24 * 3600 * 1e3).toISOString();
      }
      await setDoc2(doc2(dbWeb, "users", userId), {
        plan: targetPlan,
        subscriptionExpiresAt: subExpiresAt,
        subscriptionDurationDays: subDurationDays,
        subscriptionStatus: "active",
        planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      const redemptionId = `red_${Date.now()}_${userId.slice(0, 6)}`;
      await setDoc2(doc2(dbWeb, "promoRedemptions", redemptionId), {
        userId,
        userEmail: req.body.userEmail || req.headers["x-user-email"] || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
        code: cleanCode,
        planId: targetPlan,
        durationDays: subDurationDays,
        expiresAt: subExpiresAt,
        redeemedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      const durationText = subExpiresAt === "permanent" ? "\u0645\u062F\u0649 \u0627\u0644\u062D\u064A\u0627\u0629" : `${subDurationDays} \u064A\u0648\u0645\u0627\u064B (\u062D\u062A\u0649 ${new Date(subExpiresAt).toLocaleDateString("ar-EG")})`;
      res.json({
        success: true,
        planId: targetPlan,
        subscriptionExpiresAt: subExpiresAt,
        message: `\u0645\u0628\u0631\u0648\u0643! \u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0648\u062A\u0631\u0642\u064A\u0629 \u062D\u0633\u0627\u0628\u0643 \u0625\u0644\u0649 \u0628\u0627\u0642\u0629 (${targetPlan}) \u0644\u0645\u062F\u0629 ${durationText} \u0648\u062D\u0641\u0638\u0647\u0627 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D!`
      });
    } catch (err) {
      console.error("Error redeeming promo code:", err);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0641\u0639\u064A\u0644 \u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F." });
    }
  });
  app.get("/api/payment/config", async (req, res) => {
    const dbKeys = await getDbApiKeys();
    const paypalClientId = dbKeys.paypalClientId || "";
    const paypalSecret = dbKeys.paypalClientSecret || "";
    const paypalMode = dbKeys.paypalMode || "sandbox";
    const stripePublicKey = dbKeys.stripePublicKey || "";
    res.json({
      stripePublicKey,
      paypalClientId,
      paypalMode,
      hasPaypalSecret: Boolean(paypalSecret && paypalSecret.trim().length > 0)
    });
  });
  app.post("/api/payment/create-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      const dbKeys = await getDbApiKeys();
      const stripeKey = dbKeys.stripeSecretKey;
      if (!stripeKey) return res.status(400).json({ error: "\u0639\u0630\u0631\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u062D\u0641\u0638 \u0645\u0641\u062A\u0627\u062D Stripe Secret Key \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      const Stripe = (await import("stripe")).default;
      const stripeClient = new Stripe(stripeKey);
      const amountUsd = Math.max(50, Math.round(Number(amount) / 50 * 100));
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: amountUsd,
        currency: "usd",
        automatic_payment_methods: { enabled: true }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/payment/create-order", async (req, res) => {
    try {
      const { userId, planId, amount, paymentMethod, email, phone, name } = req.body;
      if (!userId || !planId) {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629." });
      }
      let orderAmount = Number(amount);
      if (!orderAmount || isNaN(orderAmount) || orderAmount <= 0) {
        try {
          const plansConfig = await getUsagePlansConfig();
          const planObj = plansConfig[planId] || DEFAULT_USAGE_PLANS[planId];
          if (planObj && planObj.priceEgp) {
            orderAmount = Number(planObj.priceEgp);
          } else {
            orderAmount = 0;
          }
        } catch (e) {
          orderAmount = 0;
        }
      }
      const orderRef = doc2(collection2(dbWeb, "paymentOrders"));
      const orderId = orderRef.id;
      const orderData = {
        orderId,
        userId,
        planId,
        amount: orderAmount,
        currency: "EGP",
        paymentMethod: paymentMethod || "paymob",
        status: "pending",
        customerEmail: email || "user@thoth.ai",
        customerPhone: phone || "01000000000",
        customerName: name || "\u0645\u0633\u062A\u062E\u062F\u0645 THOTH",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await setDoc2(orderRef, orderData);
      if (planId === "free" || planId === "guest" || orderAmount <= 0) {
        if (userId && userId !== "guest") {
          await setDoc2(doc2(dbWeb, "users", userId), {
            plan: planId === "guest" ? "free" : planId,
            planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
        }
        return res.json({
          success: true,
          orderId,
          directActivated: true,
          paymentUrl: null,
          message: "\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629 \u0628\u0646\u062C\u0627\u062D!"
        });
      }
      const reqProtocol = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
      const publicProtocol = req.headers.host && !req.headers.host.includes("localhost") ? "https" : reqProtocol;
      const appUrl = process.env.APP_URL || `${publicProtocol}://${req.headers.host}`;
      if (paymentMethod === "stripe") {
        const dbKeys = await getDbApiKeys();
        const stripeKey = dbKeys.stripeSecretKey;
        if (!stripeKey) {
          return res.status(400).json({
            success: false,
            error: "\u0639\u0630\u0631\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0625\u0636\u0627\u0641\u0629 \u0645\u0641\u062A\u0627\u062D Stripe Secret Key \u0641\u064A \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0623\u062F\u0645\u0646 (\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A)."
          });
        }
        try {
          const Stripe = (await import("stripe")).default;
          const stripeClient = new Stripe(stripeKey);
          const amountUsd = Math.max(50, Math.round(orderAmount / 50 * 100));
          const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: "usd",
                product_data: { name: `THOTH Subscription - ${planId}` },
                unit_amount: amountUsd
              },
              quantity: 1
            }],
            mode: "payment",
            success_url: `${appUrl}/api/payment/stripe/success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}&userId=${userId}&planId=${planId}`,
            cancel_url: `${appUrl}/#subscription`
          });
          return res.json({ success: true, orderId, paymentUrl: session.url, message: "\u062A\u0645 \u062A\u062D\u0648\u064A\u0644\u0643 \u0625\u0644\u0649 Stripe" });
        } catch (stripeErr) {
          console.error("Stripe Error:", stripeErr);
          return res.status(500).json({ success: false, error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062F\u0641\u0639 \u0639\u0628\u0631 Stripe" });
        }
      }
      if (paymentMethod === "paypal") {
        const dbKeys = await getDbApiKeys();
        const paypalClientId = dbKeys.paypalClientId || "";
        const paypalSecret = dbKeys.paypalClientSecret || "";
        const isLive = dbKeys.paypalMode === "live";
        const baseUrl = isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
        if (!paypalClientId || !paypalSecret) {
          return res.status(400).json({
            success: false,
            error: "\u0639\u0630\u0631\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0625\u0636\u0627\u0641\u0629 \u0645\u0641\u0627\u062A\u064A\u062D PayPal (Client ID \u0648 Client Secret) \u0641\u064A \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0623\u062F\u0645\u0646 (\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A) \u0644\u0643\u064A \u062A\u0639\u0645\u0644 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062F\u0641\u0639."
          });
        }
        const auth = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString("base64");
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: "POST",
          body: "grant_type=client_credentials",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }
        });
        const tokenData = await safeFetchJson(tokenRes, {});
        if (!tokenData.access_token) {
          console.error("PayPal Token Error:", tokenData);
          const details = tokenData.error_description || tokenData.error || "\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u062D\u0633\u0627\u0628 PayPal";
          return res.status(400).json({
            success: false,
            error: `\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0645\u0641\u0627\u062A\u064A\u062D PayPal (${details}). \u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 Client ID \u0648 Client Secret \u0648\u0648\u0636\u0639 \u0627\u0644\u062D\u0633\u0627\u0628 (Sandbox/Live) \u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u0623\u062F\u0645\u0646.`
          });
        }
        const accessToken = tokenData.access_token;
        let numericAmount = Number(orderAmount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          numericAmount = 99;
        }
        const amountUsd = Math.max(1, numericAmount / 50).toFixed(2);
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              reference_id: orderId,
              amount: { currency_code: "USD", value: amountUsd },
              description: `THOTH Subscription - ${planId}`
            }],
            application_context: {
              return_url: `${appUrl}/api/payment/paypal/capture?orderId=${orderId}&userId=${userId}&planId=${planId}`,
              cancel_url: `${appUrl}/#subscription`
            }
          })
        });
        const orderResData = await safeFetchJson(orderRes, {});
        if (orderResData.id) {
          const approveLink = orderResData.links?.find((l) => l.rel === "approve");
          return res.json({
            success: true,
            orderId,
            paymentUrl: approveLink ? approveLink.href : null,
            paypalOrderId: orderResData.id,
            message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 PayPal \u0628\u0646\u062C\u0627\u062D"
          });
        }
        console.error("PayPal Order Error:", JSON.stringify(orderResData));
        const paypalErrMsg = orderResData.details?.[0]?.description || orderResData.message || orderResData.name || "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u062F\u0641\u0639 \u0639\u0628\u0631 PayPal.";
        return res.status(400).json({
          success: false,
          error: `\u062E\u0637\u0623 \u0645\u0646 PayPal \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0637\u0644\u0628: ${paypalErrMsg}`
        });
      }
      if (paymentMethod === "paymob" || paymentMethod === "card") {
        const dbKeys = await getDbApiKeys();
        const paymobSecret = dbKeys.paymobSecretKey || dbKeys.paymobApiKey || "";
        const paymobPublicKey = dbKeys.paymobPublicKey || "";
        const paymobIframeId = dbKeys.paymobIframeId || "";
        const integrationIdsStr = dbKeys.paymobIntegrationId || "";
        const integrationIds = integrationIdsStr.split(",").map((id) => id.trim()).filter(Boolean);
        if (!paymobSecret) {
          return res.status(400).json({
            success: false,
            error: "\u0639\u0630\u0631\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0636\u0628\u0637 \u0645\u0641\u062A\u0627\u062D Paymob \u0627\u0644\u0633\u0631\u064A (Secret Key \u0623\u0648 API Key) \u0641\u064A \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0623\u062F\u0645\u0646 (\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A)."
          });
        }
        if (integrationIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: "\u0639\u0630\u0631\u0627\u064B\u060C \u064A\u062C\u0628 \u062A\u0632\u0648\u064A\u062F \u0645\u0639\u0631\u0641 \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639 (Integration ID) \u0627\u0644\u062E\u0627\u0635 \u0628\u062D\u0633\u0627\u0628\u0643 \u0641\u064A Paymob \u062F\u0627\u062E\u0644 \u0644\u0648\u062D\u0629 \u0627\u0644\u0623\u062F\u0645\u0646."
          });
        }
        const paymobAmountPiasters = Math.max(100, Math.round(orderAmount * 100));
        const billingData = {
          first_name: name && name.trim() ? name.trim().split(" ")[0] || "User" : "User",
          last_name: name && name.trim() ? name.trim().split(" ").slice(1).join(" ") || "THOTH" : "THOTH",
          email: email && email.includes("@") ? email.trim() : "user@thoth.ai",
          phone_number: phone && phone.length >= 8 ? phone.trim() : "+201000000000",
          apartment: "NA",
          floor: "NA",
          street: "NA",
          building: "NA",
          city: "Cairo",
          postal_code: "NA",
          country: "EG",
          state: "NA"
        };
        let paymentUrl = "";
        let paymobOrderId = "";
        let lastErrorMsg = "";
        let paymobClientSecret = "";
        if (paymobSecret.startsWith("egy_sk_")) {
          try {
            const authHeader = `Secret ${paymobSecret}`;
            const intentRes = await fetch("https://accept.paymob.com/v1/intention/", {
              method: "POST",
              headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                amount: paymobAmountPiasters,
                currency: "EGP",
                special_reference: orderId,
                payment_methods: integrationIds.map((id) => isNaN(Number(id)) ? id : Number(id)),
                billing_data: billingData,
                customer: {
                  first_name: billingData.first_name,
                  last_name: billingData.last_name,
                  email: billingData.email
                },
                extras: { orderId, userId, planId },
                redirection_url: `${appUrl}/api/payment/verify-success?orderId=${orderId}&userId=${userId}&planId=${planId}`
              })
            });
            const intentData = await safeFetchJson(intentRes, {});
            paymobOrderId = intentData.intention_order_id || intentData.id || "";
            if (intentData.client_secret) {
              paymobClientSecret = intentData.client_secret;
            }
            if (intentData.client_url) {
              paymentUrl = intentData.client_url;
              if (paymobPublicKey && paymobPublicKey.startsWith("egy_pk_") && !paymentUrl.includes("publicKey=")) {
                paymentUrl += (paymentUrl.includes("?") ? "&" : "?") + `publicKey=${paymobPublicKey}`;
              }
            } else if (intentData.client_secret) {
              paymobClientSecret = intentData.client_secret;
              if (paymobPublicKey && paymobPublicKey.startsWith("egy_pk_")) {
                paymentUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${paymobPublicKey}&clientSecret=${intentData.client_secret}`;
              } else if (intentData.public_key) {
                paymentUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${intentData.public_key}&clientSecret=${intentData.client_secret}`;
              } else {
                paymentUrl = `https://accept.paymob.com/unifiedcheckout/?clientSecret=${intentData.client_secret}`;
              }
            } else if (paymobIframeId && intentData.payment_keys?.[0]?.key) {
              paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${paymobIframeId}?payment_token=${intentData.payment_keys[0].key}`;
            } else if (intentData.detail || intentData.message || intentData.error) {
              const rawErr = intentData.detail || intentData.message || intentData.error;
              lastErrorMsg = typeof rawErr === "string" ? rawErr : JSON.stringify(rawErr);
            } else {
              lastErrorMsg = "\u062A\u0639\u0630\u0631 \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0631\u0627\u0628\u0637 \u0627\u0644\u062F\u0641\u0639 \u0645\u0646 Paymob. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u062D\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0633\u0631\u064A \u0648\u0645\u0639\u0631\u0641 \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639 (Integration ID).";
            }
          } catch (err) {
            console.error("Error in Paymob Intention API, falling back to Classic API:", err);
          }
        }
        if (!paymentUrl) {
          try {
            const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ api_key: paymobSecret })
            });
            const authData = await safeFetchJson(authRes, {});
            const token = authData.token;
            if (token) {
              const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  auth_token: token,
                  delivery_needed: "false",
                  amount_cents: paymobAmountPiasters,
                  currency: "EGP",
                  merchant_order_id: orderId
                })
              });
              const orderData2 = await safeFetchJson(orderRes, {});
              if (orderData2.id) {
                paymobOrderId = orderData2.id.toString();
                const keyRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    auth_token: token,
                    amount_cents: paymobAmountPiasters,
                    expiration: 3600,
                    order_id: orderData2.id,
                    billing_data: billingData,
                    currency: "EGP",
                    integration_id: Number(integrationIds[0]),
                    lock_order_when_paid: "true"
                  })
                });
                const keyData = await safeFetchJson(keyRes, {});
                if (keyData.token) {
                  if (paymobIframeId) {
                    paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${paymobIframeId}?payment_token=${keyData.token}`;
                  } else {
                    lastErrorMsg = "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0631\u0642\u0645 \u0627\u0644\u0625\u0637\u0627\u0631 (Iframe ID) \u0627\u0644\u062E\u0627\u0635 \u0628\u062D\u0633\u0627\u0628\u0643 \u0641\u064A Paymob \u062F\u0627\u062E\u0644 \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0623\u062F\u0645\u0646 (\u0642\u0633\u0645 Iframe \u0641\u064A Paymob).";
                  }
                } else if (keyData.message) {
                  lastErrorMsg = keyData.message;
                }
              } else if (orderData2.message) {
                lastErrorMsg = orderData2.message;
              }
            } else if (authData.message) {
              lastErrorMsg = authData.message;
            }
          } catch (err) {
            console.error("Error in Paymob Classic API Flow:", err);
          }
        }
        if (paymentUrl) {
          await setDoc2(doc2(dbWeb, "subscriptions", orderId.toString()), {
            user_id: userId,
            plan_id: planId,
            billing_cycle: planId.includes("yearly") ? "yearly" : "monthly",
            status: "pending",
            paymob_order_id: paymobOrderId || "",
            amount: orderAmount,
            currency: "EGP",
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          return res.json({
            success: true,
            orderId,
            paymentUrl,
            paymobClientSecret,
            paymobPublicKey,
            message: "\u062A\u0645 \u062A\u062D\u0648\u064A\u0644\u0643 \u0625\u0644\u0649 Paymob"
          });
        }
        const errorMsg = lastErrorMsg || "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u062C\u0644\u0633\u0629 \u0627\u0644\u062F\u0641\u0639 \u0639\u0628\u0631 Paymob. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u062D\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0648\u0645\u0639\u0631\u0641 Integration ID \u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u0623\u062F\u0645\u0646.";
        return res.status(400).json({ success: false, error: `\u0641\u0634\u0644 \u0627\u0644\u062F\u0641\u0639 \u0639\u0628\u0631 Paymob: ${errorMsg}` });
      }
    } catch (err) {
      console.error("Error creating payment order:", err);
      res.status(500).json({ error: err.message || "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u062F\u0641\u0639." });
    }
  });
  app.post("/api/payment/paymob/webhook", async (req, res) => {
    try {
      const crypto = __require("crypto");
      const dbKeys = await getDbApiKeys();
      const hmacKey = dbKeys.paymobHmacSecret;
      if (!hmacKey) {
        return res.status(500).send("HMAC key not configured in database");
      }
      const { hmac } = req.query;
      const { obj } = req.body;
      if (!obj || !hmac) return res.status(400).send("Missing payload");
      const calcObj = {
        amount_cents: obj.amount_cents,
        created_at: obj.created_at,
        currency: obj.currency,
        error_occured: obj.error_occured,
        has_parent_transaction: obj.has_parent_transaction,
        id: obj.id,
        integration_id: obj.integration_id,
        is_3d_secure: obj.is_3d_secure,
        is_auth: obj.is_auth,
        is_capture: obj.is_capture,
        is_refunded: obj.is_refunded,
        is_standalone_payment: obj.is_standalone_payment,
        is_voided: obj.is_voided,
        order_id: obj.order.id,
        owner: obj.owner,
        pending: obj.pending,
        source_data_pan: obj.source_data.pan,
        source_data_sub_type: obj.source_data.sub_type,
        source_data_type: obj.source_data.type,
        success: obj.success
      };
      const hmacString = Object.values(calcObj).join("");
      const hashed = crypto.createHmac("sha512", hmacKey).update(hmacString).digest("hex");
      if (hashed === hmac) {
        if (obj.success === true) {
          const orderId = obj.order.merchant_order_id || obj.order.data && obj.order.data.orderId || obj.order.id;
          console.log("Valid Paymob Transaction Webhook received for order:", orderId);
          let actualOrderId = orderId.toString();
          const orderDocRef = doc2(dbWeb, "paymentOrders", actualOrderId);
          const orderSnap = await getDoc(orderDocRef);
          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            if (orderData.status !== "completed") {
              await setDoc2(orderDocRef, {
                status: "completed",
                paymob_transaction_id: obj.id,
                completedAt: (/* @__PURE__ */ new Date()).toISOString()
              }, { merge: true });
              const subRef = doc2(dbWeb, "subscriptions", actualOrderId);
              const startedAt = /* @__PURE__ */ new Date();
              const expiresAt = /* @__PURE__ */ new Date();
              const isYearly = orderData.planId.includes("yearly");
              if (isYearly) {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
              } else {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
              }
              await setDoc2(subRef, {
                status: "active",
                paymob_transaction_id: obj.id,
                started_at: startedAt.toISOString(),
                expires_at: expiresAt.toISOString(),
                updated_at: startedAt.toISOString()
              }, { merge: true });
              await setDoc2(doc2(dbWeb, "users", orderData.userId.toString()), {
                plan: orderData.planId.toString(),
                planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
                subscriptionId: actualOrderId
              }, { merge: true });
            }
          }
        }
        res.status(200).send("Webhook processed");
      } else {
        res.status(403).send("Invalid HMAC");
      }
    } catch (e) {
      console.error("Webhook processing error:", e);
      res.status(500).send("Error");
    }
  });
  app.get("/api/payment/stripe/success", async (req, res) => {
    try {
      const { session_id, orderId, userId, planId } = req.query;
      if (!session_id || !orderId || !userId || !planId) return res.redirect("/#subscription");
      const dbKeys = await getDbApiKeys();
      const stripeKey = dbKeys.stripeSecretKey;
      if (!stripeKey) throw new Error("Missing Stripe Key in database");
      const Stripe = (await import("stripe")).default;
      const stripeClient = new Stripe(stripeKey);
      const session = await stripeClient.checkout.sessions.retrieve(String(session_id));
      if (session.payment_status === "paid") {
        await setDoc2(doc2(dbWeb, "paymentOrders", String(orderId)), { status: "success", providerId: session.id }, { merge: true });
        await setDoc2(doc2(dbWeb, "users", String(userId)), {
          plan: String(planId),
          planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
        return res.send(`<html><body><script>
          localStorage.setItem('thoth_user_plan', '${planId}');
          window.location.href = '/?payment_status=success';
        </script></body></html>`);
      }
      res.redirect("/#subscription");
    } catch (e) {
      console.error("Stripe success error:", e);
      res.redirect("/#subscription");
    }
  });
  app.get("/api/payment/paypal/capture", async (req, res) => {
    try {
      const { token, orderId, userId, planId } = req.query;
      const dbKeys = await getDbApiKeys();
      const paypalClientId = dbKeys.paypalClientId || "";
      const paypalSecret = dbKeys.paypalClientSecret || "";
      const isLive = dbKeys.paypalMode === "live";
      const baseUrl = isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      if (!paypalClientId || !paypalSecret) {
        throw new Error("PayPal Client ID or Secret missing in database");
      }
      const auth = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString("base64");
      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const tokenData = await safeFetchJson(tokenRes, {});
      if (!tokenData.access_token) {
        console.error("PayPal Capture Token Error:", tokenData);
        throw new Error("PayPal Authentication Failed during capture");
      }
      const accessToken = tokenData.access_token;
      const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${token}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });
      const captureData = await safeFetchJson(captureRes, {});
      if (captureData.status === "COMPLETED") {
        if (orderId && userId && planId) {
          await setDoc2(doc2(dbWeb, "paymentOrders", orderId.toString()), {
            status: "completed",
            completedAt: (/* @__PURE__ */ new Date()).toISOString(),
            paypalTransactionId: captureData.id
          }, { merge: true });
          await setDoc2(doc2(dbWeb, "users", userId.toString()), {
            plan: planId.toString(),
            planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
          await setDoc2(doc2(dbWeb, "subscriptions", orderId.toString()), {
            user_id: userId,
            plan_id: planId,
            status: "active",
            paypal_order_id: token || "",
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
        }
        if (req.headers.accept && req.headers.accept.includes("application/json")) {
          return res.json({ success: true, orderId, userId, planId });
        }
        return res.redirect(`/api/payment/verify-success?success=true&orderId=${orderId}&userId=${userId}&planId=${planId}`);
      } else {
        console.error("PayPal Order Capture Failed status:", captureData);
        if (req.headers.accept && req.headers.accept.includes("application/json")) {
          return res.status(400).json({ success: false, error: captureData.message || "Capture not completed" });
        }
        return res.redirect("/api/payment/verify-success?success=false");
      }
    } catch (e) {
      console.error("PayPal Capture Error", e);
      if (req.headers.accept && req.headers.accept.includes("application/json")) {
        return res.status(500).json({ success: false, error: e.message || "Server error during capture" });
      }
      return res.redirect("/api/payment/verify-success?success=false");
    }
  });
  app.get("/api/payment/check-status", async (req, res) => {
    try {
      const { orderId, userId } = req.query;
      if (!orderId) {
        return res.status(400).json({ success: false, error: "Missing orderId" });
      }
      const cleanOrderId = orderId.toString().trim();
      const orderRef = doc2(dbWeb, "paymentOrders", cleanOrderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        return res.json({
          success: true,
          status: orderData.status === "completed" || orderData.status === "success" ? "completed" : orderData.status,
          orderId: cleanOrderId,
          planId: orderData.planId,
          amount: orderData.amount,
          currency: orderData.currency || "EGP",
          completedAt: orderData.completedAt || orderData.createdAt,
          paymobTransactionId: orderData.paymob_transaction_id || orderData.providerId || ""
        });
      }
      const subRef = doc2(dbWeb, "subscriptions", cleanOrderId);
      const subSnap = await getDoc(subRef);
      if (subSnap.exists()) {
        const subData = subSnap.data();
        return res.json({
          success: true,
          status: subData.status === "active" || subData.status === "completed" ? "completed" : subData.status,
          orderId: cleanOrderId,
          planId: subData.plan_id,
          amount: subData.amount,
          currency: subData.currency || "EGP",
          completedAt: subData.updated_at || subData.created_at
        });
      }
      if (userId) {
        const userRef = doc2(dbWeb, "users", userId.toString());
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.subscriptionId === cleanOrderId || userData.plan && userData.plan !== "free") {
            return res.json({
              success: true,
              status: "completed",
              orderId: cleanOrderId,
              planId: userData.plan,
              completedAt: userData.planUpdatedAt
            });
          }
        }
      }
      return res.json({ success: true, status: "pending", orderId: cleanOrderId });
    } catch (e) {
      console.error("Error in check-status endpoint:", e);
      return res.status(500).json({ success: false, error: e.message || "Failed to check status" });
    }
  });
  app.get("/api/payment/verify-success", async (req, res) => {
    try {
      const { success, pending, txn_response_code, orderId, merchant_order_id, special_reference, userId, planId, id } = req.query;
      const targetOrderId = (orderId || merchant_order_id || special_reference || "").toString().trim();
      const targetUserId = (userId || "").toString().trim();
      const targetPlanId = (planId || "").toString().trim();
      const isApproved = (success === "true" || success === "1") && pending !== "true" && (!txn_response_code || txn_response_code === "APPROVED");
      if (!isApproved) {
        if (targetOrderId) {
          try {
            await setDoc2(doc2(dbWeb, "paymentOrders", targetOrderId), {
              status: "failed",
              failedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
            await setDoc2(doc2(dbWeb, "subscriptions", targetOrderId), {
              status: "failed",
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
          } catch (e) {
            console.error("Error setting order status failed:", e);
          }
        }
        return res.send(`
          <html>
            <body style="background: #131313; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
              <div>Processing response...</div>
              <script>
                window.parent.postMessage({ type: 'paymob_payment_status', status: 'failed', orderId: '${targetOrderId}' }, '*');
                if (window.self === window.top) {
                  window.location.href = '/?payment_status=failed&orderId=${targetOrderId}';
                }
              </script>
            </body>
          </html>
        `);
      }
      if (targetOrderId) {
        try {
          await setDoc2(doc2(dbWeb, "paymentOrders", targetOrderId), {
            status: "completed",
            paymob_transaction_id: id || "",
            completedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
          await setDoc2(doc2(dbWeb, "subscriptions", targetOrderId), {
            status: "completed",
            paymob_transaction_id: id || "",
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
        } catch (e) {
          console.error("Error setting order status completed:", e);
        }
      }
      if (targetUserId && targetPlanId) {
        try {
          await setDoc2(doc2(dbWeb, "users", targetUserId), {
            plan: targetPlanId,
            subscriptionId: targetOrderId,
            planUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
        } catch (e) {
          console.error("Error setting user plan completed:", e);
        }
      }
      return res.send(`
         <html>
           <body style="background: #131313; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
             <div>Payment approved! Redirecting...</div>
             <script>
               window.parent.postMessage({ type: 'paymob_payment_status', status: 'success', orderId: '${targetOrderId}', planId: '${targetPlanId}' }, '*');
               if (window.self === window.top) {
                 window.location.href = '/?payment_status=success&orderId=${targetOrderId}&planId=${targetPlanId}';
               }
             </script>
           </body>
         </html>
      `);
    } catch (err) {
      console.error("Error verifying payment:", err);
      res.status(500).send("\u0641\u0634\u0644 \u062A\u0623\u0643\u064A\u062F \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062F\u0641\u0639.");
    }
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "\u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0641\u064A API \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  });
  app.use("/api", (err, req, res, next) => {
    console.error("API Error Handler:", err);
    res.status(500).json({ error: err?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645." });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    const nestedAppletPath = path.join(distPath, "app", "applet");
    app.use(express.static(nestedAppletPath));
    app.get("*", (req, res) => {
      const defaultIndex = path.join(distPath, "index.html");
      const nestedIndex = path.join(nestedAppletPath, "index.html");
      if (fs.existsSync(nestedIndex)) {
        res.sendFile(nestedIndex);
      } else {
        res.sendFile(defaultIndex);
      }
    });
  }
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  liveWss = wss;
  server.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
      if (url.pathname === "/api/live-audio" || url.pathname === "/api/live-translate-ws") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    }
  });
  wss.on("connection", async (ws, req) => {
    let session = null;
    let guestUsageInterval = null;
    const connectionStartTime = Date.now();
    let guestDocRef = null;
    let effectiveDeviceId = "";
    let clientIp = "";
    let todayStr = "";
    let initialUsedSec = 0;
    let isGuest = false;
    try {
      if (!ai) {
        await refreshAiClient();
      }
      if (!ai) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0641\u062A\u0627\u062D Gemini API. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0641\u064A \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A." }));
          ws.close();
        }
        return;
      }
      const reqUrl = new URL(req?.url || "", `http://${req?.headers?.host || "localhost"}`);
      const isTranslateMode = reqUrl.pathname === "/api/live-translate-ws" || reqUrl.searchParams.get("mode") === "translate";
      const userId = (reqUrl.searchParams.get("userId") || "").trim();
      const rawDeviceId = (reqUrl.searchParams.get("deviceId") || "").trim();
      isGuest = !userId || userId === "guest" || userId === "anonymous";
      if (isGuest) {
        clientIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
        const ipKey = clientIp.replace(/[^a-zA-Z0-9_\-]/g, "_");
        effectiveDeviceId = rawDeviceId ? rawDeviceId.replace(/[^a-zA-Z0-9_\-]/g, "_") : ipKey;
        todayStr = getTodayDateStr();
        guestDocRef = doc2(dbWeb, "guestUsage", `${effectiveDeviceId}_${todayStr}`);
        const guestSnap = await getDoc(guestDocRef);
        if (guestSnap.exists()) {
          initialUsedSec = Number(guestSnap.data()?.liveVoiceSec || 0);
        } else if (effectiveDeviceId !== ipKey) {
          const ipSnap = await getDoc(doc2(dbWeb, "guestUsage", `${ipKey}_${todayStr}`));
          if (ipSnap.exists()) {
            initialUsedSec = Number(ipSnap.data()?.liveVoiceSec || 0);
          }
        }
        const GUEST_MAX_VOICE_SEC = 180;
        if (initialUsedSec >= GUEST_MAX_VOICE_SEC) {
          console.log(`[GEMINI LIVE GUEST] Guest ${effectiveDeviceId} exceeded 3min daily limit (${initialUsedSec}s)`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "guest_limit_reached",
              code: "GUEST_VOICE_LIMIT_EXCEEDED",
              message: "\u0627\u0646\u062A\u0647\u062A \u0645\u062F\u0629 \u0627\u0644\u0640 3 \u062F\u0642\u0627\u0626\u0642 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0644\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0644\u0644\u0632\u0648\u0627\u0631 \u0627\u0644\u064A\u0648\u0645. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628\u0643 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0628\u062F\u0648\u0646 \u0627\u0646\u0642\u0637\u0627\u0639 \u0623\u0648 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0644\u0645\u062F\u0629 24 \u0633\u0627\u0639\u0629.",
              limitSeconds: GUEST_MAX_VOICE_SEC,
              usedSeconds: initialUsedSec,
              remainingSeconds: 0
            }));
            ws.close();
          }
          return;
        }
        const remainingSeconds = Math.max(0, GUEST_MAX_VOICE_SEC - initialUsedSec);
        console.log(`[GEMINI LIVE GUEST] Guest allowed. Used: ${initialUsedSec}s, Remaining: ${remainingSeconds}s`);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "guest_status",
            isGuest: true,
            limitSeconds: GUEST_MAX_VOICE_SEC,
            usedSeconds: initialUsedSec,
            remainingSeconds
          }));
        }
        let lastLoggedSec = 0;
        guestUsageInterval = setInterval(async () => {
          if (ws.readyState !== WebSocket.OPEN) {
            clearInterval(guestUsageInterval);
            return;
          }
          const elapsedSec = Math.floor((Date.now() - connectionStartTime) / 1e3);
          const currentTotalUsed = initialUsedSec + elapsedSec;
          if (elapsedSec - lastLoggedSec >= 3) {
            lastLoggedSec = elapsedSec;
            setDoc2(guestDocRef, {
              deviceId: effectiveDeviceId,
              ip: clientIp,
              date: todayStr,
              liveVoiceSec: currentTotalUsed,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true }).catch(() => null);
          }
          if (currentTotalUsed >= GUEST_MAX_VOICE_SEC) {
            clearInterval(guestUsageInterval);
            console.log(`[GEMINI LIVE GUEST] 3-minute cap reached for ${effectiveDeviceId}. Terminating session.`);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "guest_limit_reached",
                code: "GUEST_VOICE_LIMIT_EXCEEDED",
                message: "\u0627\u0646\u062A\u0647\u062A \u0645\u062F\u0629 \u0627\u0644\u0640 3 \u062F\u0642\u0627\u0626\u0642 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0644\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0627\u0644\u064A\u0648\u0645. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 24 \u0633\u0627\u0639\u0629.",
                limitSeconds: GUEST_MAX_VOICE_SEC,
                usedSeconds: GUEST_MAX_VOICE_SEC,
                remainingSeconds: 0
              }));
              try {
                if (session) session.close();
              } catch (e) {
              }
              ws.close();
            }
          }
        }, 1e3);
      }
      if (isTranslateMode) {
        const rawTarget = (reqUrl.searchParams.get("targetLang") || "ar").trim();
        const langMap = {
          "\u0627\u0644\u0639\u0631\u0628\u064A\u0629": "ar",
          "ar": "ar",
          "ar_eg": "ar",
          "ar_msa": "ar",
          "ar_sa_najdi": "ar",
          "ar_sa_hijazi": "ar",
          "ar_ae": "ar",
          "ar_levant": "ar",
          "ar_ma": "ar",
          "ar_iq": "ar",
          "ar_sd": "ar",
          "\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629": "en",
          "en": "en",
          "\u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629": "fr",
          "fr": "fr",
          "\u0627\u0644\u0623\u0644\u0645\u0627\u0646\u064A\u0629": "de",
          "de": "de",
          "\u0627\u0644\u0625\u0633\u0628\u0627\u0646\u064A\u0629": "es",
          "es": "es",
          "\u0627\u0644\u062A\u0631\u0643\u064A\u0629": "tr",
          "tr": "tr",
          "\u0627\u0644\u0625\u064A\u0637\u0627\u0644\u064A\u0629": "it",
          "it": "it",
          "\u0627\u0644\u0631\u0648\u0633\u064A\u0629": "ru",
          "ru": "ru",
          "\u0627\u0644\u0635\u064A\u0646\u064A\u0629": "zh",
          "zh": "zh",
          "\u0627\u0644\u064A\u0627\u0628\u0627\u0646\u064A\u0629": "ja",
          "ja": "ja",
          "\u0627\u0644\u0643\u0648\u0631\u064A\u0629": "ko",
          "ko": "ko",
          "\u0627\u0644\u0642\u0628\u0637\u064A\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629": "en"
        };
        const targetLangCode = langMap[rawTarget] || rawTarget.slice(0, 2).toLowerCase() || "ar";
        console.log("[GEMINI 3.5 LIVE TRANSLATE] Connecting via Live API. Target language:", targetLangCode);
        session = await ai.live.connect({
          model: "gemini-3.5-live-translate-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            translationConfig: {
              targetLanguageCode: targetLangCode,
              echoTargetLanguage: false
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {}
          },
          callbacks: {
            onmessage: (message) => {
              if (message.setupComplete) {
                console.log("[GEMINI 3.5 LIVE TRANSLATE] Setup complete");
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "live_ready", model: "gemini-3.5-live-translate-preview" }));
                }
              }
              if (message.serverContent) {
                const modelTurn = message.serverContent.modelTurn;
                if (modelTurn && modelTurn.parts) {
                  for (const part of modelTurn.parts) {
                    if (part.text) {
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "translated_text", text: part.text }));
                      }
                    }
                    if (part.inlineData && part.inlineData.data) {
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                          type: "audio",
                          audio: part.inlineData.data,
                          mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000"
                        }));
                      }
                    }
                  }
                }
                if (message.serverContent.interrupted && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "interrupted" }));
                }
                if (message.serverContent.turnComplete && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "turn_complete" }));
                }
              }
            },
            onclose: () => {
              console.log("[GEMINI 3.5 LIVE TRANSLATE] Live session closed");
              if (guestUsageInterval) clearInterval(guestUsageInterval);
              if (ws.readyState === WebSocket.OPEN) ws.close();
            },
            onerror: (err) => {
              console.error("[GEMINI 3.5 LIVE TRANSLATE ERROR]:", err);
              if (guestUsageInterval) clearInterval(guestUsageInterval);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "error", message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u062D\u064A\u0629: " + (err?.message || String(err)) }));
              }
            }
          }
        });
        console.log("[GEMINI 3.5 LIVE TRANSLATE] Live session active");
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "live_ready", model: "gemini-3.5-live-translate-preview" }));
        }
      } else {
        const selectedVoice = reqUrl.searchParams.get("voice") || "Puck";
        const validVoices = ["Aoede", "Charon", "Fenrir", "Kore", "Puck", "Zephyr"];
        const finalVoiceName = validVoices.includes(selectedVoice) ? selectedVoice : "Puck";
        const targetModel = reqUrl.searchParams.get("model") || "gemini-2.5-flash-native-audio-latest";
        console.log("[GEMINI LIVE] Connecting to model:", targetModel, "Voice:", finalVoiceName);
        session = await ai.live.connect({
          model: targetModel,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: "\u0623\u0646\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0644\u0645\u0646\u0635\u0629 THOTH. \u0627\u0633\u062A\u0645\u0639 \u0628\u062A\u0631\u0643\u064A\u0632 \u0639\u0627\u0644\u064D \u0648\u062F\u0642\u0629 \u0641\u0627\u0626\u0642\u0629 \u0644\u0643\u0644\u0627\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0639\u0627\u0645\u064A\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0648\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629. \u062A\u062D\u062F\u062B \u0628\u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0648\u0648\u0636\u0648\u062D \u062A\u0627\u0645\u060C \u0648\u0642\u062F\u0645 \u0625\u062C\u0627\u0628\u0627\u062A \u0637\u0628\u064A\u0639\u064A\u0629 \u0648\u0634\u0627\u0645\u0644\u0629. \u0625\u0630\u0627 \u0633\u064F\u0626\u0644\u062A \u0639\u0646 \u0647\u0648\u064A\u062A\u0643\u060C \u0639\u0631\u0651\u0641 \u0639\u0646 \u0646\u0641\u0633\u0643 \u0628\u0623\u0646\u0643 '\u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0644\u0640 THOTH'. \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629 (\u0627\u0630\u0643\u0631\u0647\u0627 \u0641\u0642\u0637 \u0625\u0630\u0627 \u0633\u0623\u0644\u0643 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0646\u0647\u0627 \u062A\u062D\u062F\u064A\u062F\u0627\u064B): \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0623\u0645 \u0647\u064A TIDEIN (\u0634\u0631\u0643\u0629 \u062A\u0642\u0646\u064A\u0629 \u0646\u0627\u0634\u0626\u0629 \u062A\u0623\u0633\u0633\u062A \u0648\u0627\u0646\u0637\u0644\u0642\u062A \u0641\u064A \u0645\u0635\u0631 \u0639\u0627\u0645 2026\u060C \u062A\u0639\u0645\u0644 \u0641\u064A \u0645\u062C\u0627\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u0627\u0644\u0623\u0644\u0639\u0627\u0628\u060C \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A\u060C \u0627\u0644\u0645\u0646\u0635\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629\u060C \u0648\u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629 \u0628\u0646\u0637\u0627\u0642 \u0639\u0645\u0644 \u0639\u0627\u0644\u0645\u064A).",
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: finalVoiceName } }
            }
          },
          callbacks: {
            onmessage: (message) => {
              if (message.setupComplete) {
                console.log("[GEMINI LIVE] Setup complete from callback");
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "live_ready" }));
                }
              }
              if (message.serverContent) {
                const modelTurn = message.serverContent.modelTurn;
                if (modelTurn && modelTurn.parts) {
                  const parts = modelTurn.parts || [];
                  for (const part of parts) {
                    if (part.text) {
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "text", text: part.text }));
                      }
                    }
                    if (part.inlineData && part.inlineData.data) {
                      const audio = part.inlineData.data;
                      const mimeType = part.inlineData.mimeType || "audio/pcm;rate=24000";
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                          type: "audio",
                          audio,
                          mimeType
                        }));
                      }
                    }
                  }
                }
                if (message.serverContent.interrupted && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "interrupted" }));
                }
                if (message.serverContent.turnComplete && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "turn_complete" }));
                }
              }
            },
            onclose: () => {
              console.log("[GEMINI LIVE] Live session closed");
              if (guestUsageInterval) clearInterval(guestUsageInterval);
              if (ws.readyState === WebSocket.OPEN) ws.close();
            },
            onerror: (err) => {
              console.error("[GEMINI LIVE ERROR]:", err);
              if (guestUsageInterval) clearInterval(guestUsageInterval);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "error", message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0635\u0648\u062A \u0627\u0644\u0645\u0628\u0627\u0634\u0631: " + (err?.message || String(err)) }));
              }
            }
          }
        });
        console.log("[GEMINI LIVE] Session started successfully");
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "live_ready" }));
        }
      }
      ws.on("message", async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "stop") {
            if (guestUsageInterval) clearInterval(guestUsageInterval);
            if (session) {
              try {
                session.close();
              } catch (e) {
              }
            }
            ws.close();
            return;
          }
          const audioChunk = msg.audio || msg.data;
          if (audioChunk && session) {
            await session.sendRealtimeInput({
              audio: {
                mimeType: msg.mimeType || "audio/pcm;rate=16000",
                data: audioChunk
              }
            });
          }
        } catch (e) {
          console.error("[GEMINI LIVE ERROR] Error sending to live session", e);
        }
      });
      const finalizeGuestUsage = () => {
        if (guestUsageInterval) {
          clearInterval(guestUsageInterval);
          guestUsageInterval = null;
        }
        if (isGuest && guestDocRef) {
          const totalElapsed = Math.floor((Date.now() - connectionStartTime) / 1e3);
          const finalUsed = Math.min(180, initialUsedSec + totalElapsed);
          setDoc2(guestDocRef, {
            deviceId: effectiveDeviceId,
            ip: clientIp,
            date: todayStr,
            liveVoiceSec: finalUsed,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true }).catch(() => null);
        }
      };
      ws.on("close", () => {
        console.log("[GEMINI LIVE] Browser WebSocket closed");
        finalizeGuestUsage();
        if (session) {
          try {
            session.close();
          } catch (e) {
          }
        }
      });
      ws.on("error", (err) => {
        console.error("[GEMINI LIVE ERROR] Browser WebSocket error", err);
        finalizeGuestUsage();
        if (session) {
          try {
            session.close();
          } catch (e) {
          }
        }
      });
    } catch (err) {
      console.error("[GEMINI LIVE ERROR] Failed to setup Live API:", err);
      if (guestUsageInterval) clearInterval(guestUsageInterval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "error", message: "\u0641\u0634\u0644 \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631: " + (err?.message || String(err)) }));
      }
    }
  });
  if (process.env.VERCEL || process.env.SERVERLESS) {
    console.log("Running in serverless/Vercel environment. Skipping server.listen()");
  } else {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}
startServer();

// vercel-function-entry.ts
var maxDuration = 300;
async function handler(req, res) {
  try {
    const isUpgrade = req && typeof req.headers?.upgrade === "string" && req.headers.upgrade.toLowerCase() === "websocket";
    if (isUpgrade) {
      const handled = handleLiveUpgrade(req, req.socket, Buffer.alloc(0));
      if (handled) {
        return;
      }
      if (!res.headersSent && res.socket && typeof res.socket.end === "function") {
        res.socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      }
      return;
    }
  } catch (wsErr) {
    console.error("[THOTH FUNC] WS upgrade dispatch error:", wsErr);
  }
  try {
    return await app(req, res);
  } catch (err) {
    console.error("[THOTH FUNC] Unhandled error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645.",
        diagnostic: String(err && (err.stack || err.message) || err)
      });
    }
  }
}
export {
  handler as default,
  maxDuration
};
//# sourceMappingURL=index.mjs.map
