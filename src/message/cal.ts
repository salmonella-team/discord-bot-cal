import {ClientVoiceManager, Message, VoiceConnection, VoiceChannel} from 'discord.js'
import Option from 'type-of-option'
import {CalStatus} from '../config/type'

/**
 * 小数第一位を四捨五入して返す
 * @param n 四捨五入する数値
 * @return 四捨五入された整数
 */
const roundFloat = (n: number): number => Math.round(n * 10) / 10

/**
 * キャルが接続しているボイスチャンネルと音量とModeをDiscordのメッセージへ送信する
 * @param msg DiscordのMessage情報
 * @param voice clientのClientVoiceManager
 * @param Status キャルのステータス
 */
export const ShowStatus = (msg: Message, voice: Option<ClientVoiceManager>, Status: CalStatus) => {
  const channel: Option<string> = voice?.connections
    .map(v => v.channel)
    .filter(v => v.guild)
    .filter(v => v.guild.name === msg.guild?.name)
    .map(v => v.name)
    .toString()
  const join = channel ? `${channel}に接続しているわ` : 'どこのボイスチャンネルにも接続してないわ'
  msg.reply(`${join}\n音量は${roundFloat(Status.volume)}よ！`)
}

/**
 * ClientVoiceManagerからVoiceConnectionを取得する
 * @param msg DiscordのMessage情報
 * @param voice clientのClientVoiceManager
 * @return 取得したVoiceConnection
 */
const getVoiceConnection = (msg: Message, voice: Option<ClientVoiceManager>): Option<VoiceConnection> =>
  voice?.connections.map(v => v).filter(v => v.channel.guild.name === msg.guild?.name)[0]

/**
 * メッセージ送信者と同じボイスチャンネルにキャルを接続させ、接続状況をDiscordのメッセージへ送信する
 * @param msg DiscordのMessage情報
 * @param voice clientのClientVoiceManager
 */
export const JoinChannel = async (msg: Message, voice: Option<ClientVoiceManager>) => {
  // メッセージ送信者がボイスチャンネル入っていない場合終了
  const channel: Option<VoiceChannel> = msg.member?.voice.channel
  if (!channel) return msg.reply('あんたがボイスチャンネルに居ないと入れないじゃないの！')

  // キャルが現在の接続している場所と同じチャンネルに入ろうとした場合終了
  const connect: Option<VoiceConnection> = getVoiceConnection(msg, voice)
  if (channel?.name === connect?.channel.name) return msg.reply(`もう${channel?.name}に接続してるわ`)

  await channel?.join()
  msg.reply(`${channel?.name}に接続したわよ！`)
}

/**
 * キャルをボイスチャンネルから接続させ、切断状況をDiscordのメッセージへ送信する
 * @param msg DiscordのMessage情報
 * @param voice clientのClientVoiceManager
 */
export const Disconnect = (msg: Message, voice: Option<ClientVoiceManager>) => {
  // キャルがボイスチャンネル入っていない場合終了
  const connect: Option<VoiceConnection> = getVoiceConnection(msg, voice)
  if (!connect) return msg.reply('あたしはどこのボイスチャンネルに入ってないわよ')

  connect?.disconnect()
  msg.reply(`${connect?.channel?.name}から切断したわ`)
}

/**
 * キャルの音量を0.1上げて、音量をDiscordのメッセージへ送信する
 * @param msg DiscordのMessage情報
 * @param volume キャルの音量
 * @return 変更した音量
 */
export const VolumeUp = (msg: Message, volume: number): number => {
  // キャルの音量を1以上に上げない
  if (roundFloat(volume) >= 1) {
    msg.reply('これ以上音量を上げられないわ')
  } else {
    volume += 0.1
    msg.reply(`音量を上げたわよ！(${roundFloat(volume)})`)
  }
  return volume
}

/**
 * キャルの音量を0.1下げて、音量をDiscordのメッセージへ送信する
 * @param msg DiscordのMessage情報
 * @param volume キャルの音量
 * @return 変更した音量
 */
export const VolumeDown = (msg: Message, volume: number): number => {
  // キャルの音量を0.1以下に下げない
  if (roundFloat(volume) <= 0.1) {
    msg.reply('これ以上音量を下げられないわ')
  } else {
    volume -= 0.1
    msg.reply(`音量を下げたわよ！(${roundFloat(volume)})`)
  }
  return volume
}

/**
 * キャルの音量を指定した音量にする
 * @param msg DiscordのMessage情報
 * @param volume キャルの音量
 * @param content 指定する音量
 * @return 変更した音量
 */
export const VolumeChange = (msg: Message, volume: number, content: string): number => {
  // contentが空だった場合は終了
  if (!content) {
    msg.reply('音量が指定されていないんだけど！')
    return volume
  }

  // contentが有効な数値なのか判断する
  const valid = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, '1.0'].map(n => String(n)).find(n => n === content)
  if (!valid) {
    msg.reply('その音量にはできないんだけど！')
    return volume
  }

  msg.reply(`音量を${content}にしたわよ！`)
  return Number(content)
}

/**
 * キャルの音量をリセットする
 * @param msg DiscordのMessage情報
 * @return 変更した音量
 */
export const VolumeReset = (msg: Message): number => {
  msg.reply('音量をリセットしたわよ！(0.2)')
  return 0.2
}

/**
 * キャルのコマンド一覧をDiscordのメッセージへ送信する。
 * @param msg DiscordのMessage情報
 */
export const Help = (msg: Message) => {
  const help = `魔法一覧よ！\`\`\`
/cal        キャルの状態を表示
/cal.in     キャルをボイスチャンネルに接続
/cal.out    キャルをボイスチャンネルから切断
/cal.up     キャルの声量を上げる
/cal.down   キャルの声量を下げる
/cal.volume <0.1~1.0> キャルの声量を指定の音量にする
/cal.reset  キャルの音量をリセットする ※デフォルトは0.2
/cal.help   キャルのコマンド一覧
\`\`\`※\`.\`は\` \`で代用可能　例:\`/cal help\`
`

  msg.reply(help)
}
