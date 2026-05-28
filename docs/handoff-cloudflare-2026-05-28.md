# 引き継ぎメモ 2026-05-28 Cloudflare デプロイ対応後

## 作業ディレクトリ

```text
C:\Users\ryohe\AI-Projects\予約システム
```

## 現在のゴール

予約システムを Cloudflare Workers + Neon Postgres + Hyperdrive で動かす方向に移行中。
予約画面と管理画面のフロントは一旦作成済みで、次は実運用に必要な細部を整える段階。

## デプロイ先

- GitHub: `https://github.com/Omata0824/booking-system`
- Cloudflare Worker: `firstai-booking`
- 公開URL: `https://firstai-booking.ryohei0824.workers.dev`
- Hyperdrive binding: `HYPERDRIVE`
- Hyperdrive id: `47672aa7c64a4b27a286720faf695023`
- DB: Neon Postgres

## 直近の重要な変更

Cloudflare Workers 上で Prisma Client の WASM 実行が失敗したため、アプリ実行時の DB アクセスを Prisma から `pg` + Hyperdrive に切り替えた。

Cloudflare 上で出ていた主なエラー:

```text
CompileError: WebAssembly.Module(): Wasm code generation disallowed by embedder
```

対応内容:

- `src/lib/prisma.ts` を削除
- `src/lib/db.ts` を追加
  - ローカルでは `DATABASE_URL`
  - Cloudflare では `getCloudflareContext().env.HYPERDRIVE.connectionString`
  - `query()` と `transaction()` を提供
- `src/lib/projects.ts` を SQL 実装に変更
- `src/lib/booking.ts` を SQL 実装に変更
- `/admin/projects/new` の Server Action を SQL トランザクション保存に変更
  - `projects`
  - `project_hosts`
  - `project_availabilities`
  - `form_fields`
- `.github/workflows/deploy-cloudflare.yml` を更新
  - `actions/checkout@v6`
  - `actions/setup-node@v6`

最新コミット:

```text
708663c Fix Cloudflare database runtime
```

## 確認済み

ローカル:

```powershell
npm run lint
npm run build
```

どちらも成功済み。

GitHub Actions:

- run: `https://github.com/Omata0824/booking-system/actions/runs/26564664733`
- conclusion: `success`

Cloudflare Worker URL:

- `/admin` -> `200 OK`
- `/admin/projects/new` -> `200 OK`
- `/book/web-design` -> `200 OK`

## GitHub / Cloudflare 設定済みのもの

GitHub repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Cloudflare Worker secrets:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

`wrangler.jsonc` には Hyperdrive binding が入っている。

## 注意点

Neon の接続文字列を一度チャットに貼っているため、あとで Neon 側で DB パスワードをローテーションするのが望ましい。

`.env.local` はコミットしない。実値をドキュメントにも残さない。

Windows 上の `npm run deploy` は OpenNext が不安定なので、基本は GitHub Actions の Linux runner でデプロイする。

## 現状の機能

管理画面:

- `/admin`
  - プロジェクト一覧表示
  - DB から `projects` と担当者を取得
- `/admin/projects/new`
  - 新規プロジェクト作成画面
  - Server Action で DB 保存
  - 保存後 `/admin` に戻る

予約画面:

- `/book/[slug]`
  - DB の `project_availabilities` から受付枠を生成
  - `bookings` の `held / confirmed / unconfirmed` をブロック扱い
  - 予約確定時に `bookings` と `booking_answers` を作成

Google 連携 PoC:

- 既存の Google OAuth / Calendar FreeBusy / Event 作成 PoC は残している
- まだ本予約フローとは完全統合していない

## 次にやるとよさそうなこと

優先度高:

1. 本番URLで実際に `/admin/projects/new` からプロジェクトを1件作成して、一覧と `/book/[slug]` に反映されるか確認する
2. Neon DB パスワードをローテーションする
3. 予約確定時の Google Calendar / Meet 作成を本フローに接続する
4. 予約フォーム項目のラベルを日本語に戻す、または管理画面から編集できるようにする
5. 予約の重複防止を DB 制約レベルで強化する

その後:

- 管理画面の詳細ページ
- 予約一覧
- 予約キャンセル/変更
- 担当者ごとの受付時間
- メール通知
- 認証後だけ管理画面に入れる制御

## 次チャット開始時に貼るとよい依頼文

```text
予約システムの続きをお願いします。
作業ディレクトリは C:\Users\ryohe\AI-Projects\予約システム です。
まず docs/handoff-cloudflare-2026-05-28.md を読んで現状を把握してください。

Cloudflare Workers + Neon + Hyperdrive でデプロイ済みです。
次は本番URLで /admin/projects/new の作成フローを実際に確認して、問題があれば直してください。
```
