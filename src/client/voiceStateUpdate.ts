import * as Discord from 'discord.js'
import Option from 'type-of-option'
import Settings from 'const-settings'
import * as etc from '../config/etc'

/**
 * ボイスチャンネルの状態が変わった際に、キャルの自動入退出をする
 * @param oldState 状態遷移前の情報
 * @param newState 状態遷移後の情報
 * @param client botのClient情報
 */
export const VoiceStateUpdate = (
  oldState: Discord.VoiceState,
  newState: Discord.VoiceState,
  client: Discord.Client
) => {
  // vcで喋るサーバー以外でキャルがvcに入らないようにする
  if ([Settings.SALMONELLA_ID, Settings.BEROBA_ID, Settings.EXCEED_ID].every(id => id !== oldState.guild.id)) return

  sendVCLog(oldState, newState, client)

  // 入出前のチャンネル処理
  if (newState.channel) newStateChannel(newState.channel, client)

  // 退出前のチャンネル処理
  if (oldState.channel) oldStateChannel(oldState.channel, client)
}

/**
 * vcのログを#ログに出力する
 * @param oldState 状態遷移前の情報
 * @param newState 状態遷移後の情報
 * @param client botのClient情報
 */
const sendVCLog = (oldState: Discord.VoiceState, newState: Discord.VoiceState, client: Discord.Client) => {
  // サルモネラ菌のサーバーじゃなければ終了
  if (oldState.guild.id !== Settings.SALMONELLA_ID) return

  if (oldState.member?.user.bot) return

  const channel = client.channels.cache.get(Settings.VC_LOG_CHANNEL) as Discord.TextChannel

  // 新旧のチャンネルが同じの場合、画面共有の開始・終了かミュートの切り替えをしている
  if (oldState.channel?.id === newState.channel?.id) {
    // botは画面共有やミュートをしないので省く
    if (!oldState.member?.user.bot) {
      const msg = streamingSndMute(oldState.member)
      if (!msg) return
      channel.send(msg), console.log(msg)
      return
    }
  }

  // ニックネームを優先してユーザーネームを取得
  const name = getUserName(oldState.member)

  // チャンネルを入出した際の処理
  if (newState.channel) {
    newState.member?.roles.remove(Settings.STREAMING_ROLE)
    newState.member?.roles.remove(Settings.VIDEO_ROLE)

    // スピーカーミュート状態ならロールを付与する
    if (newState.member?.voice.deaf) newState.member?.roles.add(Settings.DEAF_ROLE)

    const msg = `${getCurrentDate()}\n${name} が \`${newState.channel.name}\` に入室しました`
    channel.send(msg), console.log(msg)
  }

  // チャンネルから退出した際の処理
  if (oldState.channel) {
    oldState.member?.roles.remove(Settings.STREAMING_ROLE)
    oldState.member?.roles.remove(Settings.VIDEO_ROLE)
    oldState.member?.roles.remove(Settings.DEAF_ROLE)

    const msg = `${getCurrentDate()}\n${name} が \`${oldState.channel.name}\` から退出しました`
    channel.send(msg), console.log(msg)
  }
}

/**
 * 画面共有とミュートの状態から出力するメッセージを返す
 * @param member 状態変化者のメンバー情報
 * @return 出力するメッセージ
 */
const streamingSndMute = (member: Option<Discord.GuildMember>): string => {
  // ニックネームを優先してユーザーネームを取得
  const name = getUserName(member)

  // ロールが付いているか確認
  const streamRole = getIsRole(Settings.STREAMING_ROLE, member)
  const videoRole = getIsRole(Settings.VIDEO_ROLE, member)
  const deafRole = getIsRole(Settings.DEAF_ROLE, member)

  // 状態のフラグを取得
  const streamFlag = member?.voice.streaming
  const videoFlag = member?.voice.selfVideo
  const deafFlag = member?.voice.deaf

  // 戻り値の定義
  const streamStart = (): string => {
    member?.roles.add(Settings.STREAMING_ROLE)
    return `${getCurrentDate()}\n${name} が画面共有を開始しました`
  }
  const streamEnd = (): string => {
    member?.roles.remove(Settings.STREAMING_ROLE)
    return `${getCurrentDate()}\n${name} が画面共有を終了しました`
  }
  const videoOn = (): string => {
    member?.roles.add(Settings.VIDEO_ROLE)
    return `${getCurrentDate()}\n${name} がカメラをオンにしました`
  }
  const videoOff = (): string => {
    member?.roles.remove(Settings.VIDEO_ROLE)
    return `${getCurrentDate()}\n${name} がカメラをオフにしました`
  }
  const mute = (): string => {
    if (deafRole) {
      if (deafFlag) {
        return `${getCurrentDate()}\n${name} がマイクミュート${member?.voice.mute ? '' : 'を解除'}しました`
      } else {
        member?.roles.remove(Settings.DEAF_ROLE)
        return `${getCurrentDate()}\n${name} がスピーカーミュートを解除しました`
      }
    } else {
      if (deafFlag) {
        member?.roles.add(Settings.DEAF_ROLE)
        return `${getCurrentDate()}\n${name} がスピーカーミュートしました`
      } else {
        return `${getCurrentDate()}\n${name} がマイクミュート${member?.voice.mute ? '' : 'を解除'}しました`
      }
    }
  }
  const none = ''

  // prettier-ignore
  if (streamRole && videoRole) {
    return (
       streamFlag &&  videoFlag ? mute()        :  // ミュート
      !streamFlag &&  videoFlag ? streamEnd()   :  // 画面共有終了
       streamFlag && !videoFlag ? videoOff()    :  // カメラオフ
      !streamFlag && !videoFlag ? none          :  // ×
    none)
  } else if (!streamRole && videoRole) {
    return (
       streamFlag &&  videoFlag ? streamStart() :  // 画面共有開始
      !streamFlag &&  videoFlag ? mute()        :  // ミュート
       streamFlag && !videoFlag ? none          :  // ×
      !streamFlag && !videoFlag ? videoOff()    :  // カメラオフ
    none)
  } else if (streamRole && !videoRole) {
    return (
       streamFlag &&  videoFlag ? videoOn()     :  // カメラオン
      !streamFlag &&  videoFlag ? none          :  // ×
       streamFlag && !videoFlag ? mute()        :  // ミュート
      !streamFlag && !videoFlag ? streamEnd()   :  // 画面共有終了
    none)
  } else if (!streamRole && !videoRole) {
    return (
       streamFlag &&  videoFlag ? none          :  // ×
      !streamFlag &&  videoFlag ? videoOn()     :  // カメラオン
       streamFlag && !videoFlag ? streamStart() :  // 画面共有開始
      !streamFlag && !videoFlag ? mute()        :  // ミュート
    none)
  } else {
    return none
  }
}

/**
 * ボイスチャンネルにキャルしか残っていない場合、またはbotしか居ない場合キャルを切断する
 * @param channel 退出前のチャンネル
 * @param client botのClient情報
 */
const oldStateChannel = async (channel: Discord.VoiceChannel, client: Discord.Client) => {
  // VCから退出
  const exitFromVC = () =>
    client.voice?.connections
      .map(v => v)
      .filter(v => v.channel === channel)[0]
      ?.disconnect()

  const users: Discord.User[] = channel.members.map(m => m.user)

  if (users.every(u => u.bot)) exitFromVC()

  // キャルしか居ない場合、切断する
  if (users.map(u => u.username).toString() === 'キャル') exitFromVC()
}

/**
 * イベントが発生したチャンネルにキャルを入出させる。
 * botしか居ない場合、または宿屋の場合入出しない
 * @param channel 状態遷移後にイベントがあったチャンネル
 * @param client botのClient情報
 */
const newStateChannel = async (channel: Discord.VoiceChannel, client: Discord.Client) => {
  // 宿屋の場合はキャルを接続させない
  if ((await etc.FetchTextList(client, Settings.AFK_CHANNEL_ID)).some((c: string) => c === channel.name)) return

  // 固定にキャルが居る場合キャルを移動させない
  const c = client.voice.connections.map(v => v.channel.name).find(n => /固定/.test(n))
  if (c) return

  const users: Discord.User[] = channel.members.map(m => m.user)
  if (users.every(u => u.bot)) return

  await channel.join()
}

/**
 * Userの名前を取得する。
 * ニックネームがある場合はそちらを取る
 * @param m Userの情報
 * @return Userの名前
 */
const getUserName = (m: Option<Discord.GuildMember>): string => {
  const name = m?.nickname
    ? `\`${m?.nickname.replace(/`/g, '').trim()}\``
    : `\`${m?.user.username.replace(/`/g, '').trim() || ' '}\``
  return name !== '``' ? name : '` `'
}

/**
 * 引数で渡したロールが付与されているか確認する
 * @param id ロールのid
 * @param m Userの情報
 * @return ロールが付与されていたかの真偽値
 */
const getIsRole = (id: string, m: Option<Discord.GuildMember>): Option<boolean> => m?.roles.cache.some(r => r.id === id)

/**
 * 現在の日付と時刻を取得
 * @return 取得した文字列
 */
const getCurrentDate = (): string => {
  const p0 = (n: number): string => (n + '').padStart(2, '0')
  const d = new Date()
  return `\`${p0(d.getHours())}:${p0(d.getMinutes())}\``
}
