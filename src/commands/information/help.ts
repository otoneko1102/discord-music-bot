import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  type Message,
} from 'discord.js';
import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext, CommandCategory, Language } from '../../types';
import commandHandler from '../CommandHandler';
import { COLOR_PRIMARY, COLOR_ERROR } from '../../utils/embeds';
import config from '../../config';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addStringOption(o =>
    o.setName('command').setDescription('Get help for a specific command')
  );
}

type PageDef = { categories: CommandCategory[] };

const PAGES: PageDef[] = [
  { categories: ['playback'] },
  { categories: ['track-state', 'queue'] },
  { categories: ['special', 'information', 'settings'] },
];

const CATEGORY_LABEL: Record<CommandCategory, Record<Language, string>> = {
  playback: { en: '🎵 Playback', ja: '🎵 再生' },
  'track-state': { en: '🔄 Track State', ja: '🔄 曲の状態' },
  queue: { en: '📋 Queue', ja: '📋 キュー' },
  special: { en: '✨ Special', ja: '✨ 特殊機能' },
  information: { en: 'ℹ️ Information', ja: 'ℹ️ 情報' },
  settings: { en: '⚙️ Settings', ja: '⚙️ 設定' },
};

const L = {
  title: {
    en: (p: number, t: number) => `🎵 Music Bot Help  •  ${p}/${t}`,
    ja: (p: number, t: number) => `🎵 ミュージックBot ヘルプ  •  ${p}/${t}ページ`,
  },
  hint: {
    en: (pfx: string) => `Use \`${pfx}help <command>\` for details on a specific command.`,
    ja: (pfx: string) => `\`${pfx}help <コマンド名>\` で詳細を確認できます。`,
  },
  footer: {
    en: (pfx: string, l: string) => `Prefix: ${pfx} • Language: ${l}`,
    ja: (pfx: string, l: string) => `プレフィックス: ${pfx} • 言語: ${l}`,
  },
  usage: { en: 'Usage', ja: '使い方' },
  alias: { en: 'Aliases', ja: 'エイリアス' },
  notFound: {
    en: (c: string) => `Command \`${c}\` not found.`,
    ja: (c: string) => `コマンド \`${c}\` が見つかりません。`,
  },
  langBtn: { en: '🇯🇵 日本語', ja: '🇺🇸 English' },
  readme: { en: '📖 README', ja: '📖 README-ja' },
};

function buildHelpEmbed(
  page: number,
  lang: Language,
  prefix: string,
  allCommands: Command[]
): EmbedBuilder {
  const total = PAGES.length;
  const pageDef = PAGES[page]!;

  const embed = new EmbedBuilder()
    .setColor(COLOR_PRIMARY)
    .setTitle(L.title[lang](page + 1, total))
    .setDescription(L.hint[lang](prefix))
    .setFooter({ text: L.footer[lang](prefix, lang) });

  for (const cat of pageDef.categories) {
    const label = CATEGORY_LABEL[cat][lang];
    const cmds = allCommands.filter(c => c.category === cat);

    const lines = cmds.map(c => {
      const desc = lang === 'ja' && c.descriptionJa ? c.descriptionJa : c.description;
      const usageStr = c.usage ? ` \`${c.usage}\`` : '';
      const aliasStr = c.aliases?.length ? `  *(${c.aliases.map(a => `\`${a}\``).join(' ')})*` : '';
      return `\`${c.name}\`${usageStr}${aliasStr} — ${desc}`;
    });

    embed.addFields({ name: label, value: lines.join('\n') || '—', inline: false });
  }

  return embed;
}

function buildRow(page: number, lang: Language, disabled = false): ActionRowBuilder<ButtonBuilder> {
  const total = PAGES.length;
  const repoUrl = config.repoUrl?.trim();
  const readmeUrl = repoUrl
    ? `${repoUrl}/blob/main/${lang === 'ja' ? 'README-ja.md' : 'README.md'}`
    : null;

  const buttons: ButtonBuilder[] = [
    new ButtonBuilder()
      .setCustomId('help_prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('help_page')
      .setLabel(`${page + 1} / ${total}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('help_next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === total - 1),
    new ButtonBuilder()
      .setCustomId('help_lang')
      .setLabel(L.langBtn[lang])
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  ];

  if (readmeUrl) {
    buttons.push(
      new ButtonBuilder().setLabel(L.readme[lang]).setStyle(ButtonStyle.Link).setURL(readmeUrl)
    );
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

async function execute(ctx: CommandContext): Promise<void> {
  const { guildManager, guildId } = ctx;
  const settings = guildManager.get(guildId);
  const prefix = settings.prefix;

  const specificCmd = ctx.isSlash ? ctx.getString('command') : (ctx.args[0] ?? null);

  if (specificCmd) {
    const cmd = commandHandler.get(specificCmd);
    const lang = settings.language;

    if (!cmd) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR_ERROR)
            .setDescription(`❌ ${L.notFound[lang](specificCmd)}`),
        ],
        flags: 64,
      });
      return;
    }

    const desc = lang === 'ja' && cmd.descriptionJa ? cmd.descriptionJa : cmd.description;
    const embed = new EmbedBuilder()
      .setColor(COLOR_PRIMARY)
      .setTitle(`${prefix}${cmd.name}`)
      .setDescription(desc);

    if (cmd.usage) {
      embed.addFields({
        name: L.usage[lang],
        value: `\`${prefix}${cmd.name} ${cmd.usage}\``,
        inline: false,
      });
    }
    if (cmd.aliases?.length) {
      embed.addFields({
        name: L.alias[lang],
        value: cmd.aliases.map(a => `\`${a}\``).join(', '),
        inline: false,
      });
    }

    await ctx.reply({ embeds: [embed] });
    return;
  }

  let currentPage = 0;
  let currentLang = settings.language;
  const allCommands = commandHandler.getAll();

  const initialEmbed = buildHelpEmbed(currentPage, currentLang, prefix, allCommands);
  const initialRow = buildRow(currentPage, currentLang);

  // Send the help message and get the Message object for the collector
  const silentFlag = MessageFlags.SuppressNotifications;
  let replyMsg: Message | null = null;
  if (ctx.isSlash && ctx.interaction) {
    await ctx.interaction.reply({
      embeds: [initialEmbed],
      components: [initialRow],
      flags: silentFlag,
    });
    replyMsg = (await ctx.interaction.fetchReply()) as Message;
  } else if (ctx.message) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replyMsg = await (ctx.message as any).reply({
      embeds: [initialEmbed],
      components: [initialRow],
      flags: silentFlag,
    });
  }

  if (!replyMsg) return;

  const collector = replyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
  });

  collector.on('collect', async interaction => {
    // Only the original requester may use the buttons
    if (interaction.user.id !== ctx.member.id) {
      await interaction.reply({
        content:
          currentLang === 'ja'
            ? 'このボタンはあなたのものではありません。'
            : 'These buttons are not for you.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    switch (interaction.customId) {
      case 'help_prev':
        currentPage = Math.max(0, currentPage - 1);
        break;
      case 'help_next':
        currentPage = Math.min(PAGES.length - 1, currentPage + 1);
        break;
      case 'help_lang':
        currentLang = currentLang === 'en' ? 'ja' : 'en';
        break;
    }

    await interaction.editReply({
      embeds: [buildHelpEmbed(currentPage, currentLang, prefix, allCommands)],
      components: [buildRow(currentPage, currentLang)],
    });
  });

  // Disable navigation buttons after timeout (keep link button intact)
  collector.on('end', async () => {
    try {
      await replyMsg!.edit({ components: [buildRow(currentPage, currentLang, true)] });
    } catch {
      /* message may have been deleted */
    }
  });
}

const command: Command = {
  name: 'help',
  aliases: ['h', 'commands', 'cmds'],
  description: 'Show all commands or details for a specific command',
  descriptionJa: 'コマンド一覧または特定コマンドの詳細を表示します',
  category: 'information',
  usage: '[command]',
  execute,
};

export default command;
