/** Keep Finn's copy plain, including flags, skin tones, keycaps and joined emoji. */
export const withoutEmoji = (text: string) => text
  .replace(/[0-9#*]\uFE0F?\u20E3/gu, '')
  .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200D\uFE0F\u20E3]/gu, '')
  .replace(/[ \t]+/g, ' ').replace(/ +([,.!?;:])/g, '$1').trim();

