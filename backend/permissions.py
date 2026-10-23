from enum import IntFlag

class PermissionFlags(IntFlag):
    VIEW_CHANNELS = 1 << 0              # 1
    SEND_MESSAGES = 1 << 1              # 2
    SEND_VOICE_NOTES = 1 << 2           # 4
    ATTACH_FILES = 1 << 3               # 8
    USE_CUSTOM_EMOJIS_STICKERS = 1 << 4 # 16
    MANAGE_EMOJIS_STICKERS = 1 << 5     # 32
    CONNECT_VOICE = 1 << 6              # 64
    STREAM_VIDEO_SCREEN = 1 << 7        # 128
    MANAGE_ROLES = 1 << 8               # 256
    ADMINISTRATOR = 1 << 9              # 512

    ALL = (1 << 10) - 1

def has_permission(user_mask: int, required_permission: PermissionFlags) -> bool:
    """
    Checks if a user bitmask includes the required permission.
    If the user has ADMINISTRATOR (1 << 9), they have all permissions automatically.
    """
    if (user_mask & PermissionFlags.ADMINISTRATOR) == PermissionFlags.ADMINISTRATOR:
        return True
    return (user_mask & required_permission) == required_permission

def combine_permissions(role_masks: list[int]) -> int:
    """Combines a list of role bitmasks into a single composite bitmask."""
    combined = 0
    for mask in role_masks:
        combined |= mask
    return combined

def permission_names(mask: int) -> list[str]:
    """Returns human-readable names for active flags in mask."""
    names = []
    for flag in PermissionFlags:
        if flag == PermissionFlags.ALL:
            continue
        if (mask & flag) == flag:
            names.append(flag.name)
    return names
