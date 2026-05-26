# ableton-mcp-node

A Node.js [MCP](https://modelcontextprotocol.io) server that lets AI assistants (Claude, etc.) control Ableton Live via [AbletonOSC](https://github.com/ideoforms/AbletonOSC).

## How it works

```
Claude ←→ MCP Server (this) ←→ OSC UDP ←→ AbletonOSC ←→ Ableton Live
```

The server listens on UDP port 11001 and sends commands to AbletonOSC on port 11000.

## Requirements

- Node.js 18+
- [Ableton Live](https://www.ableton.com/en/live/) with [AbletonOSC](https://github.com/ideoforms/AbletonOSC) installed and running
- An MCP-compatible client (e.g. [Claude Desktop](https://claude.ai/download))

## Installation

```bash
git clone https://github.com/your-username/ableton-mcp-node.git
cd ableton-mcp-node
npm install
```

## Usage

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ableton": {
      "command": "node",
      "args": ["/absolute/path/to/ableton-mcp-node/server.js"]
    }
  }
}
```

Then start Ableton Live with AbletonOSC active, and Claude will be able to control it.

### Manual

```bash
node server.js
```

## Available tools

| Category | Tools |
|---|---|
| Application | `test`, `get_version`, `show_message`, `get_log_level`, `set_log_level` |
| Transport | `play`, `stop`, `continue_playing`, `tap_tempo`, `undo`, `redo`, `capture_midi`, `stop_all_clips`, `jump_by`, `jump_to_next_cue`, `jump_to_prev_cue` |
| Song | `get/set_tempo`, `get/set_loop`, `get/set_metronome`, `get/set_time_signature`, `get/set_groove_amount`, `get_num_tracks`, `get_num_scenes`, `get_track_names`, `get_cue_points`, and more |
| Tracks | `create/delete/duplicate_track`, `get/set_track_name`, `get/set_track_volume`, `get/set_track_panning`, `get/set_track_mute`, `get/set_track_solo`, `get/set_track_arm`, `get/set_track_color`, `get/set_track_send`, and more |
| Clips | `create_clip`, `delete_clip`, `fire_clip`, `stop_clip`, `add_note`, `get_clip_notes`, `remove_clip_notes`, `duplicate_loop`, `get/set_clip_name`, `get/set_clip_color`, `get/set_clip_loop`, `get/set_clip_pitch`, and more |
| Scenes | `fire_scene`, `create/delete/duplicate_scene`, `get/set_scene_name`, `get/set_scene_color`, `get/set_scene_tempo` |
| Devices | `get_device_name`, `get_device_parameters_name`, `get/set_device_parameter_value` |
| View | `get/set_selected_track`, `get/set_selected_scene`, `get/set_selected_clip` |

## License

MIT
