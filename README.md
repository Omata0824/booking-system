# 予約システム Google 連携 PoC

Google OAuth でログインしたホストのプライマリカレンダーを対象に、以下を確認する
最小アプリです。

- `FreeBusy API` による今後7日間の予定有無の取得
- 予定作成直前の空き再確認
- Google Meet URL 付きの30分テスト予定作成

## セットアップ

1. Google Cloud Console で `Google Calendar API` を有効化します。
2. OAuth Web クライアントに以下を登録します。

```text
承認済みの JavaScript 生成元: http://localhost:3000
承認済みのリダイレクト URI: http://localhost:3000/api/auth/callback/google
```

3. `.env.local.example` を `.env.local` に複製し、OAuth クライアントの値を設定します。

```env
AUTH_GOOGLE_ID=Google Cloud Console のクライアント ID
AUTH_GOOGLE_SECRET=Google Cloud Console のクライアント シークレット
```

4. Auth.js のセッション暗号化用シークレットを生成し、表示された値を
   `.env.local` の `AUTH_SECRET=` の右辺に設定します。

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

`AUTH_SECRET` はローカルのみで保持し、Google のクライアントシークレットと
ともにコミットしません。

5. 開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、Google ログイン後に
`FreeBusy API を試す`、続いて未来時刻を選んで `Meet 付きテスト予定を作成`
を実行します。

## 注意点

- Meet 付きテスト予定作成は、ログインした Google アカウントのカレンダーへ
  実際に予定を追加します。
- 現時点ではDB保存や複数ホスト割り当ては実装していません。Calendar / Meet
  API の実現性を確認するためのPoCです。
- トークンはPoCのJWTセッション内で保持しています。本実装ではDBに暗号化して
  保管する設計へ切り替えます。

## 検証結果

2026-05-27 に Google OAuth ログイン、FreeBusy 取得、Google Meet 付き予定の
作成まで確認済みです。結果と本実装へ引き継ぐ論点は
[`docs/poc-google-calendar-meet.md`](./docs/poc-google-calendar-meet.md) に記録しています。

## データモデル

予約ドメインのER図、暗号化方針、予約競合制約は
[`docs/data-model-v0.1.md`](./docs/data-model-v0.1.md) に記録しています。
Prisma スキーマは [`prisma/schema.prisma`](./prisma/schema.prisma) です。

DB 接続先を用意した後は `.env.local` に `DATABASE_URL` を設定し、初期 migration を
適用します。

```bash
npx prisma migrate deploy
```

初期表示用のサンプルデータは以下で投入できます。

```bash
npm run db:seed
```

ローカルでは Docker Desktop + PostgreSQL コンテナでDBを動かしています。
Railway を使う場合は、発行された接続URLを `DATABASE_URL` に設定します。

Docker を使う場合は以下で PostgreSQL を起動します。作業パスに日本語が含まれるため、
プロジェクト名を明示します。

```powershell
$env:COMPOSE_PROJECT_NAME="booking-system"
docker compose up -d
```

Docker を使う場合の `DATABASE_URL` は以下です。

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booking_system
```
