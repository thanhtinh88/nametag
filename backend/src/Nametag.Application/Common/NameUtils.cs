using System.Text.RegularExpressions;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;

namespace Nametag.Application.Common;

public static class NameUtils
{
    private static readonly Regex CjkRegex = new(
        @"^[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]+$",
        RegexOptions.Compiled);

    public static bool IsCJK(string text) => !string.IsNullOrEmpty(text) && CjkRegex.IsMatch(text);

    public static string NameSeparator(params string?[] parts)
    {
        var nonEmpty = parts.Where(p => !string.IsNullOrEmpty(p)).ToList();
        return nonEmpty.Count > 0 && nonEmpty.All(p => IsCJK(p!)) ? "" : " ";
    }

    public static string FormatGraphName(Person person, NameOrder nameOrder = NameOrder.WESTERN, NameDisplayFormat format = NameDisplayFormat.FULL)
    {
        if (!string.IsNullOrEmpty(person.DisplayNameOverride))
        {
            return person.DisplayNameOverride;
        }

        if (format == NameDisplayFormat.SHORT)
        {
            return !string.IsNullOrEmpty(person.Nickname) ? person.Nickname : person.Name;
        }

        if (format == NameDisplayFormat.NICKNAME_PREFERRED)
        {
            var displayName = !string.IsNullOrEmpty(person.Nickname) ? person.Nickname : person.Name;
            if (string.IsNullOrEmpty(person.Surname)) return displayName;

            if (nameOrder == NameOrder.EASTERN)
            {
                var sep = NameSeparator(displayName, person.Surname);
                return $"{person.Surname}{sep}{displayName}";
            }
            return $"{displayName} {person.Surname}";
        }

        var nicknameStr = !string.IsNullOrEmpty(person.Nickname) ? $"'{person.Nickname}'" : null;

        if (string.IsNullOrEmpty(person.Surname) && (string.IsNullOrEmpty(person.MiddleName) || nameOrder != NameOrder.EASTERN))
        {
            if (nicknameStr != null)
            {
                return $"{person.Name} {nicknameStr}";
            }
            return person.Name;
        }

        if (nameOrder == NameOrder.EASTERN)
        {
            var parts = new List<string>();
            if (!string.IsNullOrEmpty(person.Surname)) parts.Add(person.Surname);
            if (!string.IsNullOrEmpty(person.MiddleName)) parts.Add(person.MiddleName);
            parts.Add(person.Name);
            if (nicknameStr != null) parts.Add(nicknameStr);
            var sep = NameSeparator(person.Name, person.Surname, person.MiddleName);
            return string.Join(sep, parts);
        }

        var westernParts = new List<string> { person.Name };
        if (nicknameStr != null) westernParts.Add(nicknameStr);
        if (!string.IsNullOrEmpty(person.Surname)) westernParts.Add(person.Surname);
        return string.Join(" ", westernParts);
    }

    public static string FormatFullName(Person person, NameOrder nameOrder = NameOrder.WESTERN, NameDisplayFormat format = NameDisplayFormat.FULL)
    {
        if (!string.IsNullOrEmpty(person.DisplayNameOverride))
        {
            return person.DisplayNameOverride;
        }

        return FormatPersonName(person.Name, person.Surname, person.MiddleName, person.SecondLastName, person.Nickname, nameOrder, format);
    }

    public static string FormatCanonicalName(Person person, NameOrder nameOrder = NameOrder.WESTERN, NameDisplayFormat format = NameDisplayFormat.FULL)
    {
        return FormatPersonName(person.Name, person.Surname, person.MiddleName, person.SecondLastName, person.Nickname, nameOrder, format);
    }

    public static string FormatPersonName(
        string name,
        string? surname = null,
        string? middleName = null,
        string? secondLastName = null,
        string? nickname = null,
        NameOrder nameOrder = NameOrder.WESTERN,
        NameDisplayFormat format = NameDisplayFormat.FULL)
    {
        if (format == NameDisplayFormat.SHORT)
        {
            return !string.IsNullOrEmpty(nickname) ? nickname : name;
        }

        var nicknameStr = !string.IsNullOrEmpty(nickname) ? $"'{nickname}'" : null;

        if (nameOrder == NameOrder.EASTERN)
        {
            var sep = NameSeparator(name, surname, middleName, secondLastName);
            var parts = new List<string>();
            if (!string.IsNullOrEmpty(surname)) parts.Add(surname);
            if (!string.IsNullOrEmpty(secondLastName)) parts.Add(secondLastName);
            if (!string.IsNullOrEmpty(middleName)) parts.Add(middleName);
            parts.Add(name);
            if (nicknameStr != null) parts.Add(nicknameStr);
            return string.Join(sep, parts);
        }

        var westernParts = new List<string> { name };
        if (nicknameStr != null) westernParts.Add(nicknameStr);
        if (!string.IsNullOrEmpty(middleName)) westernParts.Add(middleName);
        if (!string.IsNullOrEmpty(surname)) westernParts.Add(surname);
        if (!string.IsNullOrEmpty(secondLastName)) westernParts.Add(secondLastName);
        return string.Join(" ", westernParts);
    }
}

