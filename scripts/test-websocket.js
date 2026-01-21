#!/usr/bin/env node

/**
 * WebSocket Test Script for ProFootball Backend
 * Tests real-time match updates and chat functionality
 */

const io = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MATCH_ID = process.argv[2];

if (!MATCH_ID) {
  console.error('❌ Usage: node test-websocket.js <MATCH_ID>');
  console.error('   Example: node test-websocket.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   ProFootball WebSocket Test                         ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');
console.log(`🔌 Connecting to ${BASE_URL}/matches...`);
console.log(`📊 Testing match: ${MATCH_ID}`);
console.log('');

// Connect to matches namespace
const matchesSocket = io(`${BASE_URL}/matches`, {
  transports: ['websocket'],
  reconnection: true,
});

let scoreUpdateCount = 0;
let eventCount = 0;
let statsUpdateCount = 0;

matchesSocket.on('connect', () => {
  console.log('✅ Connected to matches namespace');
  console.log(`   Socket ID: ${matchesSocket.id}`);
  console.log('');
  
  console.log('📡 Subscribing to match updates...');
  matchesSocket.emit('subscribe:match', { matchId: MATCH_ID });
});

matchesSocket.on('subscribed:match', (data) => {
  console.log('✅ Subscribed to match');
  console.log(`   Room: ${data.room}`);
  console.log('');
  console.log('👂 Listening for updates...');
  console.log('   (Updates will appear below)');
  console.log('');
});

matchesSocket.on('match:score_update', (data) => {
  scoreUpdateCount++;
  console.log(`⚽ Score Update #${scoreUpdateCount}:`);
  console.log(`   ${data.homeScore} - ${data.awayScore} (${data.minute}')`);
  console.log('');
});

matchesSocket.on('match:event', (data) => {
  eventCount++;
  const event = data.event;
  console.log(`🎯 Match Event #${eventCount}:`);
  console.log(`   Type: ${event.type}`);
  console.log(`   Minute: ${event.minute}'`);
  console.log(`   Team: ${event.team}`);
  if (event.player) console.log(`   Player: ${event.player}`);
  if (event.description) console.log(`   Description: ${event.description}`);
  console.log('');
});

matchesSocket.on('match:stats_update', (data) => {
  statsUpdateCount++;
  const stats = data.statistics;
  console.log(`📊 Statistics Update #${statsUpdateCount}:`);
  console.log(`   Possession: ${stats.homePossession}% - ${stats.awayPossession}%`);
  console.log(`   Shots: ${stats.homeShots} - ${stats.awayShots}`);
  console.log(`   Shots on Target: ${stats.homeShotsOnTarget} - ${stats.awayShotsOnTarget}`);
  console.log('');
});

matchesSocket.on('error', (error) => {
  console.error('❌ Error:', error.code, error.message);
});

matchesSocket.on('disconnect', () => {
  console.log('');
  console.log('⚠️  Disconnected from server');
});

matchesSocket.on('pong', () => {
  // Heartbeat response
});

// Send heartbeat every 30 seconds
setInterval(() => {
  matchesSocket.emit('ping');
}, 30000);

// Summary after 60 seconds
setTimeout(() => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Test Summary (60 seconds)                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`   Score Updates: ${scoreUpdateCount}`);
  console.log(`   Match Events: ${eventCount}`);
  console.log(`   Stats Updates: ${statsUpdateCount}`);
  console.log('');
  console.log('✅ WebSocket test completed');
  console.log('   (Connection will remain open. Press Ctrl+C to exit)');
  console.log('');
}, 60000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Disconnecting...');
  matchesSocket.disconnect();
  process.exit(0);
});

