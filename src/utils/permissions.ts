import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import guildManager from '../core/GuildManager';

/**
 * Returns true if the member has bot-admin access:
 * guild owner, Administrator, Manage Guild, or a configured master role.
 */
export function hasAdminAccess(member: GuildMember): boolean {
  if (member.guild.ownerId === member.id) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const { masterRoles } = guildManager.get(member.guild.id);
  return masterRoles.some(id => member.roles.cache.has(id));
}

/**
 * Returns true if the member passes the guild's role filter.
 * Admin access always bypasses the filter.
 */
export function passesRoleFilter(member: GuildMember): boolean {
  if (hasAdminAccess(member)) return true;
  const { roleMode, roleList } = guildManager.get(member.guild.id);
  if (roleMode === 'all' || roleList.length === 0) return true;
  const hasRole = roleList.some(id => member.roles.cache.has(id));
  return roleMode === 'whitelist' ? hasRole : !hasRole;
}
