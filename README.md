# Ollama Proxy

複数のLLMバックエンド（OpenAI、Gemini、Ollama）を統合するプロキシサーバー。OpenAI互換APIとOllamaプロトコルの両方をサポートし、異なるLLMサービスをシームレスに利用できます。
⚠️注意：現在はOpenAIバックエンドしかまともに動きません！

## 機能

- **複数バックエンドサポート**
  - OpenAI API
  - Google Gemini API
  - Ollama API

- **統一API**
  - OpenAI互換エンドポイント (`/v1/chat/completions`, `/v1/completions`, `/v1/models`)
  - Ollama互換エンドポイント (`/api/chat`, `/api/generate`, `/api/tags`など)

- **自動モデルマッピング**
  - 起動時に各バックエンドから利用可能なモデルを自動検出
  - エイリアスを自動生成し、簡単なモデル名でアクセス可能

- **ストリーミングサポート**
  - すべてのバックエンドでストリーミングレスポンス対応

## 使い方

### 前提条件

- Node.js 14以上
- npm または yarn
- OpenAIとGeminiのAPIキー（使用する場合）
- Ollama（ローカルで実行する場合）

### インストール

```bash
git clone https://github.com/yourusername/ollama-proxy.git
cd ollama-proxy
npm install
```

### 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定します：

```
# 必須: OpenAI API キー（OpenAIバックエンドを使用する場合）
OPENAI_API_KEY=sk-...

# 必須: Google Cloud Access Token（Geminiバックエンドを使用する場合）
GCP_ACCESS_TOKEN=...

# オプション: API エンドポイント（デフォルト値は以下の通り）
OPENAI_BASE_URL=https://api.openai.com/v1
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
OLLAMA_BASE_URL=http://localhost:11434

# オプション: サーバーポート（デフォルトは11434）
PORT=11434
```

### 実行

開発モード：

```bash
npm run dev
```

プロダクションモード：

```bash
npm run build
npm start
```

## APIエンドポイント

### OpenAI互換エンドポイント

- `POST /v1/chat/completions` - チャット補完
- `POST /v1/completions` - テキスト補完
- `GET /v1/models` - 利用可能なモデルのリスト

### Ollama互換エンドポイント

- `POST /api/chat` - チャットリクエスト
- `POST /api/generate` - テキスト生成
- `GET /api/models` - モデル一覧
- `GET /api/tags` - タグ一覧（モデル一覧のエイリアス）

## モデルマッピング

このプロキシは、シンプルなモデル名（例：`gpt4`、`gemini`、`llama2`）を実際のバックエンドモデル（例：`gpt-4-turbo`、`gemini-pro`、`llama2:latest`）にマッピングします。

サーバー起動時に、各バックエンドから利用可能なモデルが自動的に検出され、適切なエイリアスが生成されます。

## 開発

### プロジェクト構造

```
src/
  ├── index.ts              # メインアプリケーション
  ├── types.ts              # 型定義
  ├── backends/             # バックエンド実装
  │   ├── base.ts           # バックエンド基底クラス
  │   ├── openai.ts         # OpenAIバックエンド
  │   ├── gemini.ts         # Geminiバックエンド
  │   └── ollama.ts         # Ollamaバックエンド
  └── handlers/             # リクエストハンドラー
      ├── chat.ts           # Ollamaチャットハンドラー
      ├── generate.ts       # Ollama生成ハンドラー
      ├── models.ts         # モデル関連ハンドラー
      └── openai/           # OpenAI互換ハンドラー
          ├── chat.ts       # OpenAIチャットハンドラー
          ├── completions.ts # OpenAI補完ハンドラー
          └── models.ts     # OpenAIモデルハンドラー
```

### 新しいバックエンドの追加

1. `src/backends/`に新しいバックエンドクラスを作成
2. `LLMBackend`抽象クラスを継承して実装
3. `index.ts`に新しいバックエンドを登録
4. `types.ts`の`ModelMap`インターフェースに新しいバックエンドタイプを追加

## 制限事項

- 一部のOllamaエンドポイント（`/api/create`、`/api/pull`、`/api/push`など）は現在実装されていません
- Gemini APIはチャット機能が限定的です
- 超長いメッセージはOllamaバックエンドで切り詰められる場合があります

## ライセンス

ISC

## 貢献

バグ報告、機能リクエスト、プルリクエストなどの貢献を歓迎します。