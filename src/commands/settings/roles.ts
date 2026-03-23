import { EmbedBuilder, Colors, type SlashCommandBuilder, type Role } from 'discord.js';
import type { Command, CommandContext, GuildSettings, RoleFilterMode } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder
    .addSubcommand(sub => sub.setName('view').setDescription('View current role settings'))
    .addSubcommand(sub =>
      sub
        .setName('mode')
        .setDescription('Set the role filter mode')
        .addStringOption(o =>
          o
            .setName('mode')
            .setDescription('Filter mode')
            .setRequired(true)
            .addChoices(
              { name: 'All (no restriction)', value: 'all' },
              { name: 'Whitelist', value: 'whitelist' },
              { name: 'Blacklist', value: 'blacklist' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a role to the filter list')
        .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a role from the filter list')
        .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('master_add')
        .setDescription('Add a master role (full bot access, bypasses role filter)')
        .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('master_remove')
        .setDescription('Remove a master role')
        .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true))
    ) as SlashCommandBuilder;
}

function extractRoleId(arg: string): string | null {
  const mention = /^<@&(\d+)>$/.exec(arg);
  if (mention) return mention[1]!;
  if (/^\d+$/.test(arg)) return arg;
  return null;
}

async function sendView(ctx: CommandContext, settings: GuildSettings): Promise<void> {
  const { t, guild } = ctx;

  const fmt = (id: string) => `<@&${id}>`;
  const filterList =
    settings.roleList.length > 0 ? settings.roleList.map(fmt).join(' ') : t('roles.noRoles');
  const masterList =
    settings.masterRoles.length > 0 ? settings.masterRoles.map(fmt).join(' ') : t('roles.noRoles');

  const embed = new EmbedBuilder()
    .setTitle(t('roles.title'))
    .setColor(Colors.Blurple)
    .addFields(
      { name: t('roles.filterMode'), value: `\`${settings.roleMode}\``, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: t('roles.filterList'), value: filterList },
      { name: t('roles.masterList'), value: masterList }
    )
    .setFooter({ text: guild.name });

  await ctx.reply({ embeds: [embed] });
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, guildManager, guildId, guild } = ctx;
  const settings = guildManager.get(guildId);

  // Slash command
  if (ctx.isSlash) {
    const sub = ctx.interaction!.options.getSubcommand(true);

    if (sub === 'view') {
      await sendView(ctx, settings);
      return;
    }

    if (sub === 'mode') {
      const mode = ctx.interaction!.options.getString('mode', true) as RoleFilterMode;
      guildManager.set(guildId, { roleMode: mode });
      await ctx.reply({ embeds: [successEmbed(t('roles.modeSet', mode))] });
      return;
    }

    const role = ctx.interaction!.options.getRole('role', true) as Role;

    if (sub === 'add') {
      if (settings.roleList.includes(role.id)) {
        await ctx.reply({ embeds: [errorEmbed(t('roles.alreadyInList'))], flags: 64 });
        return;
      }
      guildManager.set(guildId, { roleList: [...settings.roleList, role.id] });
      await ctx.reply({ embeds: [successEmbed(t('roles.added', role.name))] });
    } else if (sub === 'remove') {
      if (!settings.roleList.includes(role.id)) {
        await ctx.reply({ embeds: [errorEmbed(t('roles.notInList'))], flags: 64 });
        return;
      }
      guildManager.set(guildId, { roleList: settings.roleList.filter(id => id !== role.id) });
      await ctx.reply({ embeds: [successEmbed(t('roles.removed', role.name))] });
    } else if (sub === 'master_add') {
      if (settings.masterRoles.includes(role.id)) {
        await ctx.reply({ embeds: [errorEmbed(t('roles.alreadyInList'))], flags: 64 });
        return;
      }
      guildManager.set(guildId, { masterRoles: [...settings.masterRoles, role.id] });
      await ctx.reply({ embeds: [successEmbed(t('roles.masterAdded', role.name))] });
    } else if (sub === 'master_remove') {
      if (!settings.masterRoles.includes(role.id)) {
        await ctx.reply({ embeds: [errorEmbed(t('roles.notInList'))], flags: 64 });
        return;
      }
      guildManager.set(guildId, { masterRoles: settings.masterRoles.filter(id => id !== role.id) });
      await ctx.reply({ embeds: [successEmbed(t('roles.masterRemoved', role.name))] });
    }
    return;
  }

  // Text command
  const [sub, ...rest] = ctx.args;

  if (!sub || sub === 'list' || sub === 'view') {
    await sendView(ctx, settings);
    return;
  }

  if (sub === 'mode') {
    const mode = rest[0]?.toLowerCase();
    if (!['all', 'whitelist', 'blacklist'].includes(mode ?? '')) {
      await ctx.reply({
        embeds: [errorEmbed(t('common.invalidArgs', 'roles mode <all|whitelist|blacklist>'))],
        flags: 64,
      });
      return;
    }
    guildManager.set(guildId, { roleMode: mode as RoleFilterMode });
    await ctx.reply({ embeds: [successEmbed(t('roles.modeSet', mode!))] });
    return;
  }

  if (sub === 'add' || sub === 'remove') {
    const roleId = extractRoleId(rest[0] ?? '');
    if (!roleId) {
      await ctx.reply({ embeds: [errorEmbed(t('roles.invalidRole'))], flags: 64 });
      return;
    }
    const roleName = guild.roles.cache.get(roleId)?.name ?? roleId;

    if (sub === 'add') {
      if (settings.roleList.includes(roleId)) {
        await ctx.reply({ embeds: [errorEmbed(t('roles.alreadyInList'))], flags: 64 });
        return;
      }
      guildManager.set(guildId, { roleList: [...settings.roleList, roleId] });
      await ctx.reply({ embeds: [successEmbed(t('roles.added', roleName))] });
    } else {
      if (!settings.roleList.includes(roleId)) {
        await ctx.reply({ embeds: [errorEmbed(t('roles.notInList'))], flags: 64 });
        return;
      }
      guildManager.set(guildId, { roleList: settings.roleList.filter(id => id !== roleId) });
      await ctx.reply({ embeds: [successEmbed(t('roles.removed', roleName))] });
    }
    return;
  }

  if (sub === 'master') {
    const action = rest[0]?.toLowerCase();
    const roleId = extractRoleId(rest[1] ?? '');

    if ((action !== 'add' && action !== 'remove') || !roleId) {
      await ctx.reply({
        embeds: [errorEmbed(t('common.invalidArgs', 'roles master <add|remove> <@role|roleId>'))],
        flags: 64,
      });
      return;
    }

    const roleName = guild.roles.cache.get(roleId)?.name ?? roleId;

    if (action === 'add') {
      if (settings.masterRoles.includes(roleId)) {
        await ctx.reply({ embeds: [errorEmbed(t('roles.alreadyInList'))], flags: 64 });
        return;
      }
      guildManager.set(guildId, { masterRoles: [...settings.masterRoles, roleId] });
      await ctx.reply({ embeds: [successEmbed(t('roles.masterAdded', roleName))] });
    } else {
      if (!settings.masterRoles.includes(roleId)) {
        await ctx.reply({ embeds: [errorEmbed(t('roles.notInList'))], flags: 64 });
        return;
      }
      guildManager.set(guildId, { masterRoles: settings.masterRoles.filter(id => id !== roleId) });
      await ctx.reply({ embeds: [successEmbed(t('roles.masterRemoved', roleName))] });
    }
    return;
  }

  await sendView(ctx, settings);
}

const command: Command = {
  name: 'roles',
  aliases: ['role', 'roleperm'],
  description: 'Manage role-based access control for the bot',
  descriptionJa: 'ロールベースのアクセス制御を管理します',
  category: 'settings',
  usage:
    '[view | mode <all|whitelist|blacklist> | add <@role> | remove <@role> | master <add|remove> <@role>]',
  requiresAdmin: true,
  execute,
};

export default command;
