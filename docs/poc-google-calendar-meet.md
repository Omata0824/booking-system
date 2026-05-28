# Google Calendar / Meet 連携 PoC 結果

## 実施日

2026-05-27

## 目的

予約システムの Phase 1 実装に先立ち、ホストの Google カレンダーを使用した
空き判定と Google Meet 付き予定作成が実現可能であることを確認する。

## 検証構成

- Next.js App Router + TypeScript
- Auth.js + Google Provider
- Google Calendar API
- 対象カレンダー: ログインユーザーの `primary`
- タイムゾーン: `Asia/Tokyo`

## 検証結果

| 検証項目 | 結果 | 備考 |
| --- | --- | --- |
| Google OAuth ログイン | 成功 | External / Testing 構成でテストユーザーを登録 |
| Calendar 権限付与 | 成功 | Calendar スコープを許可 |
| FreeBusy による予定有無取得 | 成功 | プライマリカレンダーを対象に確認 |
| 作成直前の空き再確認 | 実装済み | 予定が存在する場合は作成を拒否する PoC 実装 |
| Calendar イベント作成 | 成功 | 30分の検証予定を作成 |
| Google Meet URL 発行 | 成功 | イベント上で Meet 参加リンクを確認 |

## 実装で確定できた事項

- 空き判定は Calendar API の `freeBusy` を都度照会する方式で実装可能。
- Meet URL はイベント作成時に `conferenceDataVersion=1` と
  `conferenceData.createRequest` を指定することで発行可能。
- 予約確定処理では、予定作成直前に対象スロットの `freeBusy` を再確認する。
- Google アクセストークン更新用のリフレッシュトークンを本実装では
  DBへ暗号化保存する必要がある。

## 本実装に残る設計事項

- 複数ホスト、複数カレンダーを含む空きスロット算出
- 予約確定の同時実行対策と冪等性
- Calendar イベント作成成功後に DB 保存が失敗した場合の補償処理
- キャンセル、日程変更時のイベント更新・削除フロー
- テストモードの7日間認可期限を踏まえた本番 OAuth 公開方針

## 次工程

データモデル詳細化に進む。特に以下を定義する。

- `User`, `GoogleAccount`, `CalendarConnection`
- `Project`, `ProjectHost`, 稼働時間テーブル
- `Booking`, `BookingAnswer`, ステータス履歴
- 外部イベントID、トークン暗号化値、予約競合防止用の制約
