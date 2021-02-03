import * as Discord from 'discord.js'
import moji from 'moji'
import axios from 'axios'
import {AxiosRequestConfig} from 'axios'
import {getAudioUrl} from 'google-tts-api'
import throwEnv from 'throw-env'
import Option from 'type-of-option'
import Settings from 'const-settings'
import * as cal from '../message/cal'
import * as speak from '../message/speak'
import * as spreadsheet from '../message/spreadsheet'
import {Mode, Status} from '../config/type'

/**
 * キャルの音量とモードを管理
 * @property Volume: Number - キャルの音量
 * @property Mode: Mode - キャルのDevMode
 */
const status: Status = {
  Volume: 0.3,
  Mode: Mode.Off,
}

/**
 * 入力されたメッセージに応じて適切なコマンドを実行する
 * @param msg DiscordからのMessage
 * @param client bot(キャル)のclient
 */
export const Message = async (msg: Discord.Message, client: Discord.Client) => {
  // キャルのメッセージはコマンド実行しない
  if (msg.member?.user.username === 'キャル') return

  let comment: Option<string>

  // 直前のメッセージを削除
  comment = await removeMessage(msg)
  if (comment) return console.log(comment)

  // スペース、カンマ、コロン、イコールの場合でもコマンドが動くようにピリオドに変換する
  const command: string = msg.content.replace(/ |\.|,|:|=/, '.')

  // キャルに関するコマンドを実行
  comment = calCommands(command, msg, client)
  if (comment) return console.log(comment)

  // 音声再生のコマンドを実行
  comment = speakCommands(command, msg)
  if (comment) return console.log(comment)

  // 存在しないコマンドの処理
  comment = await notExistCommands(command, msg)
  if (comment) return console.log(comment)

  // 入力された文字を読み上げる処理
  comment = await readAloud(msg, client)
  if (comment) return console.log(comment)
}

/**
 * キャルに関するコマンドを実行する。
 * 実行した場合はコメントを返し、しなかった場合は何も返さない
 * @param command 入力されたコマンド
 * @param msg DiscordからのMessage
 * @param client bot(キャル)のclient
 * @return 実行したコマンドの結果
 */
const calCommands = (command: string, msg: Discord.Message, client: Discord.Client): Option<string> => {
  // 指定のチャンネル以外でキャルが動かないようにする
  const channel = msg.channel as Discord.TextChannel
  if (!Settings.COMMAND_CHANNEL.some((c: string) => c === channel?.name)) return

  switch (command.split(' ')[0]) {
    case '/cal':
    case '/cal.status':
      cal.ShowStatus(msg, client.voice, status)
      return 'cal show status'

    case '/cal.in':
    case '/cal.join':
    case '/cal.connect':
      cal.JoinChannel(msg, client.voice)
      return 'cal join channel'

    case '/cal.out':
    case '/cal.discon':
    case '/cal.disconnect':
      cal.Disconnect(msg, client.voice)
      return 'cal disconnect channel'

    case '/cal.up':
      status.Volume = cal.VolumeUp(msg, status.Volume)
      return 'cal volume up'

    case '/cal.down':
      status.Volume = cal.VolumeDown(msg, status.Volume)
      return 'cal volume down'

    case '/cal.vol':
    case '/cal.volume':
      const content = command.split(' ')[1]
      status.Volume = cal.VolumeChange(msg, status.Volume, content)
      return 'cal volume change'

    case '/cal.reset':
      status.Volume = cal.VolumeReset(msg)
      return 'cal reset'

    case '/cal.help':
      cal.Help(msg, status.Mode)
      return 'cal help'

    case '/cal.yabai':
      cal.Yabai(msg, client, status.Volume)
      return 'cal yabai'

    case '/cal.list':
    case '/cal.wl':
      const name = command.split(' ')[1]
      if (!name) {
        cal.GetWhiteList(msg)
        return 'get whitelist'
      } else {
        cal.AddWhiteList(msg, name)
        return `add whitelist ${name}`
      }

    case '/cal.mode':
      status.Mode = cal.SwitchMode(msg, status.Mode)
      return 'switch devMode'
  }

  switch (true) {
    case /bpm/.test(command): {
      const [, former, ahead, bpm] = command.replace('.', ' ').split(' ').map(Number)
      msg.channel.send((former / ahead) * bpm)
      return 'bpm calc'
    }
  }
}

/**
 * 音声再生のコマンドを実行する。
 * 実行した場合はコメントを返し、しなかった場合は何も返さない
 * @param command 入力されたコマンド
 * @param msg DiscordからのMessage
 * @return 実行したコマンドの結果
 */
const speakCommands = (command: string, msg: Discord.Message): Option<string> => {
  // 指定のチャンネル以外でキャルが動かないようにする
  const channel = msg.channel as Discord.TextChannel
  if (!Settings.COMMAND_CHANNEL.some((c: string) => c === channel?.name)) return

  const value: Option<{
    url: string
    text: string
    comment: string
  }> = (() => {
    switch (command) {
      case '/yabai':
      case '/yab':
        return {
          url: Settings.URL.YABAI,
          text: 'ヤバイわよ！',
          comment: 'speak yabai',
        }
      case '/yabai.desu':
      case '/yabd':
        return {
          url: Settings.URL.YABAIDESU,
          text: 'やばいですね☆',
          comment: 'speak yabai.desu',
        }

      case '/yabai.wayo':
      case '/yabw':
        return {
          url: Settings.URL.YABAIWAYO,
          text: 'プリコネの年末年始はヤバイわよ！',
          comment: 'speak yabai.wayo',
        }

      case '/yabai.yaba':
      case '/yaby':
        return {
          url: Settings.URL.YABAIYABA,
          text: 'ヤバイヤバイヤバイヤバイヤバイやばいですね☆',
          comment: 'speak yabai.yaba',
        }

      case 'jinai':
      case 'jinnai':
        return {
          url: Settings.URL.JINNAI,
          text: '笑いのニューウェーブ\n陣 内 智 則',
          comment: 'speak jinnai',
        }

      case 'jinaitomonori':
      case 'jinnaitomonori':
        return {
          url: Settings.URL.JINNAITOMONORI,
          text: '次々に、新しい仕掛けを繰り出すのは、この男〜！\n笑いのニューウェーブ\n陣 内 智 則',
          comment: 'speak jinnaitomonori',
        }

      case 'usamaru':
        return {
          url: Settings.URL.USAMARU,
          text: 'ｷﾞｶﾞｷﾞｶﾞﾌﾝﾌﾝｶﾞｶﾞｶﾞｶﾞｶﾞｶﾞｶﾞｶﾞｶﾞ',
          comment: 'speak usamaru',
        }

      case 'ニューイヤーバースト':
        return {
          url: Settings.URL.NYARU,
          text: '何発でも打ち込むわ！ニューイヤーバースト！！！',
          comment: 'speak nyaru',
        }

      case 'heero':
        return {
          url: Settings.URL.HEERO,
          text: 'ヒイロ・ユイ',
          comment: 'speak heero',
        }

      case 'deden':
        return {
          url: Settings.URL.DEDEN,
          text: 'ﾃﾞﾃﾞﾝ',
          comment: 'speak deden',
        }

      case 'gi':
        return {
          url: Settings.URL.GI,
          text: 'ギラティナ',
          comment: 'speak gi',
        }

      case '船越':
        return {
          url: Settings.URL.FUNAKOSHI,
          text: '火曜サスペンス劇場 フラッシュバックテーマ',
          comment: 'speak funakoshi',
        }

      case '片平':
        return {
          url: Settings.URL.KATAHIRA,
          text: '火曜サスペンス劇場 アイキャッチ',
          comment: 'speak katahira',
        }

      case '<.reichan:778714208954220586>':
        return {
          url: Settings.URL.REITYAN,
          text: 'れいちゃん',
          comment: 'speak reityan',
        }

      case '素敵な仲間が増えますよ':
        return {
          url: Settings.URL.KARIN,
          text: 'クソメガネ',
          comment: 'speak karin',
        }
    }

    // DevModeでない場合、下の処理は行わない
    if (!status.Mode) return

    switch (command) {
      case '/yabai.full':
      case '/yabf':
        return {
          url: Settings.URL.YABAIFULL,
          text: 'プリコネの年末年始はヤバイわよ！(Full)',
          comment: 'speak yabai.full',
        }

      case '/yabai.yabai':
        return {
          url: Settings.URL.YABAIYABAI,
          text: 'ヤバイヤバイヤバイヤバイヤバイヤバイ',
          comment: 'speak yabai.yabai',
        }

      case '/yabai.slow':
        return {
          url: Settings.URL.YABAISLOW,
          text: 'ヤバイヤバイヤバイヤバイヤバイやばいですね☆(slow)',
          comment: 'speak yabai.slow',
        }

      case '/yabai.otwr':
        return {
          url: Settings.URL.YABAIOTWR,
          text: 'ヤバイヤバイヤバイヤバイヤバイやばいですね☆(otwr)',
          comment: 'speak yabai.otwr',
        }
    }
  })()

  // コマンドがない場合終了
  if (!value) return

  speak.Play(msg, value.url, status.Volume, value.text)
  return value.comment
}

/**
 * 存在しないコマンドの処理をする。
 * 実行した場合はコメントを返し、しなかった場合は何も返さない
 * @param command 入力されたコマンド
 * @param msg DiscordからのMessage
 * @return 実行したコマンドの結果
 */
const notExistCommands = async (command: string, msg: Discord.Message): Promise<Option<string>> => {
  // 指定のチャンネル以外でキャルが動かないようにする
  const channel = msg.channel as Discord.TextChannel
  if (!Settings.COMMAND_CHANNEL.some((c: string) => c === channel?.name)) return

  // コマンドじゃない場合終了
  if (command.charAt(0) !== '/') return

  // ホワイトリストにコマンドがある場合は終了
  const list = await spreadsheet.GetWhiteList()
  const cmd = command.slice(1).split('.')[0]
  if (list.find(l => l === cmd)) return

  msg.reply('そんなコマンドないんだけど！')
  return 'missing command'
}

/**
 * 直前のメッセージを削除。
 * 引数で数を指定できる
 * @param msg DiscordからのMessage
 * @return 実行したコマンドの結果
 */
const removeMessage = async (msg: Discord.Message): Promise<Option<string>> => {
  // ヤバイわよ！のロールがついて入れば実行可能
  const roles = msg.member?.roles.cache.map(r => r.name)
  if (!Settings.REMOTE_YABAI.some((r: string) => roles?.find(v => v === r))) return ''

  switch (true) {
    case /rm/.test(msg.content): {
      // スラッシュが入っていなければ終了
      const match = msg.content.replace(/・/g, '/').match(/\//)
      if (!match) return ''

      // チャンネルのメッセージ履歴を取得
      const msgList = (await msg.channel.messages.fetch()).map(v => v)
      // 引数の値を数を取得ない場合は1
      const n = (arg => (/\d/.test(arg) ? Number(arg) : 1))(msg.content.replace('/rm ', ''))
      // 指定された回数と`/rm`のメッセージを消す
      ;[...Array(n + 1)].forEach((_, i) => setTimeout(() => msgList[i].delete(), 100))

      return 'delete message'
    }

    default: {
      return ''
    }
  }
}

/**
 * 入力された文字を読み上げる処理、先頭にenが付いていたら英語で日本語を喋る
 * @param msg DiscordからのMessage
 * @param client bot(キャル)のclient
 * @return 読み上げた文字の内容
 */
const readAloud = async (msg: Discord.Message, client: Discord.Client): Promise<Option<string>> => {
  // botのメッセージは喋らない
  if (msg.author.bot) return

  // 読み上げするチャンネル以外では喋らない
  const channel = msg.channel as Discord.TextChannel
  if (!Settings.READ_ALOUD_CHANNEL.some((c: string) => c === channel?.name)) return

  // 全角のｗ|Ｗを入力した人をvcから切断する
  if (/ｗ|Ｗ/.test(msg.content)) {
    msg.reply('全角文字打つやつはぶっ殺すわよ！！')
    return
  }

  // キャルがvcに居ない場合は終了
  const vc = client.voice.connections.map(v => v).filter(v => v.channel.guild.id === msg.guild?.id)
  if (!vc.length) return

  // コードブロックの場合は終了
  if (/\`\`\`/.test(msg.content)) return

  // 英語か日本語かを判別
  const lang = /^en/.test(msg.content.replace('おはなし', '').trim()) ? 'en-US' : 'ja-JP'

  // 入力された文字を読み上げられる形に整形
  const content = aloudFormat(msg.content)

  // 文字が空の場合は終了
  if (!content) return

  // ひらがな化APIを使用するためにパラメータ等を設定
  const options: AxiosRequestConfig = {
    method: 'post',
    url: Settings.API_URL.HIRAGANA,
    headers: {'Content-Type': 'application/json'},
    data: {
      app_id: throwEnv('HIRAGANA_APIKEY'),
      sentence: content,
      output_type: 'katakana',
    },
  }

  // ひらがな化APIを使って構文解析をし、カタカナに変換する
  const res = await axios(options)
    .then(r => r.data)
    .catch(e => console.log(e))

  // 変換された文字をgttsに投げ、音声を取得する
  const url = getAudioUrl(res.converted.slice(0, 200), {
    lang: lang,
    slow: false,
    host: Settings.API_URL.GTTS,
  })

  // 現在キャルが入っているチャンネルで音声を再生する
  const connect = await vc[0].voice?.channel?.join()
  connect?.play(url, {volume: 0.5})

  return `speak ${lang === 'en-US' ? 'en ' : ''}${content}`
}

/**
 * 入力された文字を読み上げられる形に整形する
 * @param content 整形する前の文字列
 * @return 整形した後の文字列
 */
const aloudFormat = (content: string): string => {
  /**
   * 行末wをワラに変える
   * @param str 変換する文字列
   * @return 変換した文字列
   */
  const replaceWara = (str: string): string => {
    let flag = false
    return str
      .split('')
      .reverse()
      .map(s => {
        if (flag) return s
        if (!/w/i.test(s)) {
          flag = true
          return s
        } else {
          return 'ワラ'
        }
      })
      .reverse()
      .join('')
  }

  // callする毎に><が切り替わるObjectを作成
  const separat = {
    char: ['>', '<'],
    count: 0,
    call: () => separat.char[separat.count ? separat.count-- : separat.count++],
  }

  // 絵文字トリム用のカウンタ
  const counter = {
    count: 0,
    call: () => (counter.count = counter.count === 2 ? 0 : counter.count + 1),
  }

  /**
   * 絵文字の余計な部分を消す為に:を<>に変換する
   * @param c 文字
   * @param i インデックス
   * @param str 配列
   * @return 変換した文字
   */
  const emojiTrim = (c: string, i: number, str: string[]): string => {
    if (counter.count) {
      return c === ':' ? (counter.call(), separat.call()) : c
    } else {
      if (c === '<' && str[i + 1] === ':') counter.call()
      return c
    }
  }

  return moji(content)
    .convert('HK', 'ZK') // 半角カナを全角カナに変換
    .toString() // String型に戻す
    .replace(/おはなし|お話し|お話/, '') // おはなしを除去する
    .trim() // 余分な空白を除去
    .replace(/^en/, '') // 先頭のenを除去
    .trim() // 余分な空白を除去
    .replace(/https?:\/\/\S+/g, '') // URLを除去
    .split('\n') // 一行ずつに分解
    .map(replaceWara) // 文末のwをワラに変える
    .join('') // 分解した文字を結合
    .split('') // 一文字ずつに分解
    .map(emojiTrim) // :を><に変換
    .join('') // 分解した文字を結合
    .replace(/<[^<>]*>/g, '') // <>に囲まれている文字を全て除去
    .slice(0, 200) // 200文字以上は喋れないので切り捨てる
}
