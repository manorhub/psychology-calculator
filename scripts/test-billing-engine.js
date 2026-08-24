import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { LemonSqueezyService } from '../src/services/billing/lemon-squeezy.service.js';
import { PlanService } from '../src/services/billing/plan.service.js';
import { SubscriptionService } from '../src/services/billing/subscription.service.js';
import { EntitlementService } from '../src/services/billing/entitlement.service.js';
import { WebhookService } from '../src/services/billing/webhook.service.js';

console.log('=== Psychology Calculator Phase 11: Lemon Squeezy Monetization & Billing Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database
const rawDb = new DatabaseSync(':memory:');
rawDb.exec('PRAGMA foreign_keys = ON;');

const mockD1 = {
  prepare(query) {
    const stmt = rawDb.prepare(query);
    return {
      bind(...params) {
        return {
          async first() {
            return stmt.get(...params) || null;
          },
          async all() {
            const results = stmt.all(...params);
            return { results, success: true };
          },
          async run() {
            const info = stmt.run(...params);
            return {
              success: true,
              meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) }
            };
          }
        };
      },
      async first() {
        return stmt.get() || null;
      },
      async all() {
        const results = stmt.all();
        return { results, success: true };
      },
      async run() {
        const info = stmt.run();
        return {
          success: true,
          meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) }
        };
      }
    };
  }
};

// Apply all 14 migrations
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  rawDb.exec(sql);
}

// Apply development seeds
const seedSql = fs.readFileSync(path.resolve(process.cwd(), 'seeds/dev_seed.sql'), 'utf8');
rawDb.exec(seedSql);
console.log(`✔ In-memory SQLite initialized with ${migrationFiles.length} migrations and seed data`);

// Helper to generate Lemon Squeezy HMAC SHA256 signature
function generateWebhookSignature(payloadString, secret) {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

async function runBillingTests() {
  const webhookSecret = 'test_webhook_secret_key_xyz_789';
  const lsService = new LemonSqueezyService({
    apiKey: 'ls_test_api_key_placeholder',
    storeId: 'store_101',
    webhookSecret,
    mode: 'test'
  });

  const planService = new PlanService(mockD1);
  const subscriptionService = new SubscriptionService(mockD1, lsService);
  const entitlementService = new EntitlementService(mockD1);
  const webhookService = new WebhookService(mockD1, lsService);

  // Setup Test Users
  const userIdA = 'usr_billing_alice';
  const userIdB = 'usr_billing_bob';

  rawDb.prepare("INSERT INTO users (id, email, role, status) VALUES (?, ?, 'user', 'active')").run(
    userIdA,
    'alice@example.com'
  );
  rawDb.prepare("INSERT INTO profiles (user_id, display_name) VALUES (?, 'Alice Johnson')").run(userIdA);

  rawDb.prepare("INSERT INTO users (id, email, role, status) VALUES (?, ?, 'user', 'active')").run(
    userIdB,
    'bob@example.com'
  );
  rawDb.prepare("INSERT INTO profiles (user_id, display_name) VALUES (?, 'Bob Smith')").run(userIdB);

  console.log('\n--- 1. Testing Dynamic Plan Retrieval & Entitlements ---');
  const activePlans = await planService.getActivePlans();
  assert.ok(activePlans.length >= 3, 'Should have at least Free, Monthly, Annual plans');

  const freePlan = activePlans.find((p) => p.slug === 'free');
  assert.ok(freePlan);
  assert.strictEqual(freePlan.price, 0);
  assert.strictEqual(freePlan.entitlements.basic_assessments.is_enabled, true);
  assert.strictEqual(freePlan.entitlements.premium_assessments.is_enabled, false);

  const monthlyPlan = activePlans.find((p) => p.slug === 'pro-monthly');
  assert.ok(monthlyPlan);
  assert.strictEqual(monthlyPlan.lemon_squeezy_variant_id, 'variant_monthly_test_123');
  assert.strictEqual(monthlyPlan.entitlements.premium_ai_reports.is_enabled, true);
  assert.strictEqual(monthlyPlan.entitlements.premium_pdf_exports.is_enabled, true);
  console.log(`✔ Dynamic plans verified: "${freePlan.name}" ($${freePlan.price}) & "${monthlyPlan.name}" ($${monthlyPlan.price})`);

  console.log('\n--- 2. Testing Lemon Squeezy Hosted Checkout Session Creation ---');
  const checkoutResult = await lsService.createCheckout({
    variantId: monthlyPlan.lemon_squeezy_variant_id,
    userEmail: 'alice@example.com',
    userName: 'Alice Johnson',
    userId: userIdA,
    planId: monthlyPlan.id
  });

  assert.ok(checkoutResult.checkoutUrl);
  assert.ok(checkoutResult.checkoutUrl.includes('variant_monthly_test_123'));
  console.log(`✔ Checkout initialized with customer mapping: "${checkoutResult.checkoutUrl}"`);

  console.log('\n--- 3. Testing Cryptographic HMAC-SHA256 Signature Verification ---');
  const samplePayload = JSON.stringify({
    meta: { event_name: 'subscription_created', webhook_id: 'wh_evt_1001' },
    data: {
      id: 'sub_ls_12345',
      attributes: {
        customer_id: 'cust_ls_999',
        variant_id: 'variant_monthly_test_123',
        status: 'active',
        created_at: new Date().toISOString(),
        renews_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        user_email: 'alice@example.com',
        custom_data: { user_id: userIdA, plan_id: monthlyPlan.id }
      }
    }
  });

  const validSig = generateWebhookSignature(samplePayload, webhookSecret);
  const isValid = await lsService.verifyWebhookSignature(samplePayload, validSig, webhookSecret);
  assert.strictEqual(isValid, true, 'Valid signature must pass HMAC verification');

  const invalidSig = 'deadbeef1234567890abcdef';
  const isInvalid = await lsService.verifyWebhookSignature(samplePayload, invalidSig, webhookSecret);
  assert.strictEqual(isInvalid, false, 'Forged signature must be rejected');

  await assert.rejects(
    async () => {
      await webhookService.processWebhook(samplePayload, invalidSig, webhookSecret);
    },
    { message: 'Invalid Lemon Squeezy webhook signature' }
  );
  console.log('✔ Cryptographic HMAC verification verified: Valid signatures pass, forged signatures blocked');

  console.log('\n--- 4. Testing Webhook Processing & Idempotency ---');
  const res1 = await webhookService.processWebhook(samplePayload, validSig, webhookSecret);
  assert.strictEqual(res1.status, 'processed');
  assert.strictEqual(res1.eventName, 'subscription_created');

  // Verify D1 subscription created
  const aliceSummary = await subscriptionService.getUserSubscriptionSummary(userIdA);
  assert.strictEqual(aliceSummary.hasSubscription, true);
  assert.strictEqual(aliceSummary.isPremium, true);
  assert.strictEqual(aliceSummary.status, 'active');
  assert.strictEqual(aliceSummary.planSlug, 'pro-monthly');
  assert.strictEqual(aliceSummary.entitlements.premium_ai_reports, true);
  assert.strictEqual(aliceSummary.entitlements.premium_pdf_exports, true);
  console.log('✔ D1 subscription activated and user entitlements granted');

  // Verify duplicate webhook delivery is safely ignored
  const res2 = await webhookService.processWebhook(samplePayload, validSig, webhookSecret);
  assert.strictEqual(res2.status, 'duplicate');
  console.log('✔ Webhook idempotency verified: Duplicate event safely recorded without re-processing');

  console.log('\n--- 5. Testing Centralized Entitlement Engine ---');
  // User A (Pro Subscriber)
  const canAliceFree = await entitlementService.canTakeAssessment(userIdA, 'free');
  assert.strictEqual(canAliceFree.allowed, true);

  const canAlicePremium = await entitlementService.canTakeAssessment(userIdA, 'premium');
  assert.strictEqual(canAlicePremium.allowed, true);

  const canAliceAI = await entitlementService.canGenerateAIReport(userIdA);
  assert.strictEqual(canAliceAI.allowed, true);

  const canAlicePdf = await entitlementService.canDownloadPdf(userIdA, 'ai_report');
  assert.strictEqual(canAlicePdf.allowed, true);

  // User B (Free Member)
  const canBobFree = await entitlementService.canTakeAssessment(userIdB, 'free');
  assert.strictEqual(canBobFree.allowed, true);

  const canBobPremium = await entitlementService.canTakeAssessment(userIdB, 'premium');
  assert.strictEqual(canBobPremium.allowed, false);
  assert.strictEqual(canBobPremium.requiredPlan, 'pro-monthly');

  const canBobAI = await entitlementService.canGenerateAIReport(userIdB);
  assert.strictEqual(canBobAI.allowed, false);

  const canBobPdf = await entitlementService.canDownloadPdf(userIdB, 'ai_report');
  assert.strictEqual(canBobPdf.allowed, false);

  console.log('✔ EntitlementService permissions verified: Pro users granted access, Free users gated cleanly');

  console.log('\n--- 6. Testing Order & Payment Ingestion ---');
  const orderPayload = JSON.stringify({
    meta: { event_name: 'order_created', webhook_id: 'wh_order_2001' },
    data: {
      id: 'ord_ls_9999',
      attributes: {
        customer_email: 'alice@example.com',
        total: 1499, // $14.99 in cents
        currency: 'USD',
        status: 'paid',
        urls: { receipt: 'https://app.lemonsqueezy.com/my-orders/ord_ls_9999' },
        custom_data: { user_id: userIdA }
      }
    }
  });

  const orderSig = generateWebhookSignature(orderPayload, webhookSecret);
  const orderRes = await webhookService.processWebhook(orderPayload, orderSig, webhookSecret);
  assert.strictEqual(orderRes.status, 'processed');

  const alicePayments = await subscriptionService.getUserPayments(userIdA);
  assert.strictEqual(alicePayments.length, 1);
  assert.strictEqual(alicePayments[0].amount, 14.99);
  assert.strictEqual(alicePayments[0].status, 'paid');
  console.log(`✔ Order recorded in payments ledger ($${alicePayments[0].amount} ${alicePayments[0].currency})`);

  console.log('\n--- 7. Testing Subscription Cancellation & Period-End Access ---');
  // In-app cancellation request
  const cancelSuccess = await subscriptionService.cancelUserSubscription(userIdA);
  assert.strictEqual(cancelSuccess, true);

  const cancelledSummary = await subscriptionService.getUserSubscriptionSummary(userIdA);
  assert.strictEqual(cancelledSummary.cancelAtPeriodEnd, true);
  // User should STILL retain premium access because current_period_end is in the future
  assert.strictEqual(cancelledSummary.isPremium, true);
  console.log('✔ Scheduled cancellation retains Pro entitlements until period end');

  // Webhook: subscription_expired
  const expirePayload = JSON.stringify({
    meta: { event_name: 'subscription_expired', webhook_id: 'wh_evt_3001' },
    data: {
      id: 'sub_ls_12345',
      attributes: {
        customer_id: 'cust_ls_999',
        status: 'expired',
        ends_at: new Date(Date.now() - 1000).toISOString(),
        custom_data: { user_id: userIdA }
      }
    }
  });

  const expireSig = generateWebhookSignature(expirePayload, webhookSecret);
  await webhookService.processWebhook(expirePayload, expireSig, webhookSecret);

  const expiredSummary = await subscriptionService.getUserSubscriptionSummary(userIdA);
  assert.strictEqual(expiredSummary.status, 'expired');
  assert.strictEqual(expiredSummary.isPremium, false);

  const canAliceAfterExpiry = await entitlementService.canTakeAssessment(userIdA, 'premium');
  assert.strictEqual(canAliceAfterExpiry.allowed, false);
  console.log('✔ Expired subscription immediately revokes Pro entitlements');

  console.log('\n--- 8. Testing Admin Billing Ledgers ---');
  const allSubs = await subscriptionService.getAllSubscriptions(50);
  assert.ok(allSubs.length >= 1);

  const allTx = await subscriptionService.getAllTransactions(50);
  assert.ok(allTx.length >= 1);

  const webhookLogs = await webhookService.listWebhookLogs(50);
  assert.ok(webhookLogs.length >= 3);
  console.log(`✔ Admin ledgers loaded: ${allSubs.length} subscriptions, ${allTx.length} transactions, ${webhookLogs.length} webhooks`);

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 11 LEMON SQUEEZY BILLING & ENTITLEMENT TESTS PASSED!');
  console.log('============================================================\n');
}

runBillingTests().catch((err) => {
  console.error('❌ Billing Engine Test failed:', err);
  process.exit(1);
});
