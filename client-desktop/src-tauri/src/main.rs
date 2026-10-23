// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn get_hardware_id() -> String {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        if let Ok(crypto) = hklm.open_subkey("SOFTWARE\\Microsoft\\Cryptography") {
            if let Ok(guid) = crypto.get_value::<String, _>("MachineGuid") {
                return format!("WIN-{}", guid);
            }
        }
    }

    // Fallback UUID if registry read fails or other OS
    format!("WIN-{}", uuid::Uuid::new_v4().to_string())
}

#[tauri::command]
fn get_device_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Echo-Windows-PC".to_string())
}

#[tauri::command]
fn get_platform_type() -> String {
    "PC_DESKTOP".to_string()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_hardware_id,
            get_device_name,
            get_platform_type
        ])
        .run(tauri::generate_context!())
        .expect("error while running echo desktop tauri application");
}
