import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import OSC from "osc";

const oscPort = new OSC.UDPPort({
  localAddress: "127.0.0.1",
  localPort: 11001,
  remoteAddress: "127.0.0.1",
  remotePort: 11000,
});

const responses = {};

oscPort.on("message", (msg) => {
  responses[msg.address] = msg.args;
});

oscPort.open();

function sendAndWait(address, args = [], timeout = 300) {
  return new Promise((resolve) => {
    delete responses[address];
    oscPort.send({ address, args });
    const start = Date.now();
    const interval = setInterval(() => {
      if (responses[address] !== undefined) {
        clearInterval(interval);
        resolve(responses[address]);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, 10);
  });
}

function send(address, args = []) {
  oscPort.send({ address, args });
}

function i(value) { return { type: "i", value: parseInt(value) }; }
function f(value) { return { type: "f", value: parseFloat(value) }; }
function s(value) { return { type: "s", value: String(value) }; }

function extractArgs(result) {
  if (!result) return null;
  return result.map(a => (a && typeof a === "object" && "value" in a) ? a.value : a);
}

function ok(text) {
  return { content: [{ type: "text", text }] };
}

const server = new Server(
  { name: "ableton", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── Application ──────────────────────────────────────────────────────────
    {
      name: "test",
      description: "Ping AbletonOSC to confirm it is running",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_version",
      description: "Get the Ableton Live version",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "show_message",
      description: "Display a message in the Ableton status bar",
      inputSchema: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
    },
    {
      name: "get_log_level",
      description: "Get the current AbletonOSC log level",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "set_log_level",
      description: "Set the AbletonOSC log level (debug/info/warning/error/critical)",
      inputSchema: {
        type: "object",
        properties: { level: { type: "string" } },
        required: ["level"],
      },
    },

    // ── Song – transport ──────────────────────────────────────────────────────
    {
      name: "play",
      description: "Start Ableton playback",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "stop",
      description: "Stop Ableton playback",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "continue_playing",
      description: "Resume playback from current position",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "tap_tempo",
      description: "Tap the tempo button",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "undo",
      description: "Undo the last action",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "redo",
      description: "Redo the last undone action",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "capture_midi",
      description: "Capture MIDI into a new clip",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "stop_all_clips",
      description: "Stop all currently playing clips",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "trigger_session_record",
      description: "Trigger session record mode",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "jump_by",
      description: "Jump playback position forward or backward by a number of beats",
      inputSchema: {
        type: "object",
        properties: { beats: { type: "number", description: "Beats to jump (negative = backward)" } },
        required: ["beats"],
      },
    },
    {
      name: "jump_to_next_cue",
      description: "Jump to the next cue marker",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "jump_to_prev_cue",
      description: "Jump to the previous cue marker",
      inputSchema: { type: "object", properties: {} },
    },

    // ── Song – tracks / scenes ────────────────────────────────────────────────
    {
      name: "create_midi_track",
      description: "Create a new MIDI track at the given index (-1 = end)",
      inputSchema: {
        type: "object",
        properties: { index: { type: "integer", description: "Insertion index (-1 = end)" } },
        required: ["index"],
      },
    },
    {
      name: "create_audio_track",
      description: "Create a new audio track at the given index (-1 = end)",
      inputSchema: {
        type: "object",
        properties: { index: { type: "integer" } },
        required: ["index"],
      },
    },
    {
      name: "create_return_track",
      description: "Create a new return track",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "delete_track",
      description: "Delete a track by index",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "delete_return_track",
      description: "Delete a return track by index",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "duplicate_track",
      description: "Duplicate a track by index",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "create_scene",
      description: "Create a new scene at the given index (-1 = end)",
      inputSchema: {
        type: "object",
        properties: { index: { type: "integer" } },
        required: ["index"],
      },
    },
    {
      name: "delete_scene",
      description: "Delete a scene by index",
      inputSchema: {
        type: "object",
        properties: { scene_index: { type: "integer" } },
        required: ["scene_index"],
      },
    },
    {
      name: "duplicate_scene",
      description: "Duplicate a scene by index",
      inputSchema: {
        type: "object",
        properties: { scene_index: { type: "integer" } },
        required: ["scene_index"],
      },
    },

    // ── Song – getters ────────────────────────────────────────────────────────
    {
      name: "get_tempo",
      description: "Get the current BPM of the session",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_is_playing",
      description: "Get whether Ableton is currently playing",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_current_song_time",
      description: "Get the current playback position in beats",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_song_length",
      description: "Get the total length of the arrangement in beats",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_signature_numerator",
      description: "Get the time signature numerator",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_signature_denominator",
      description: "Get the time signature denominator",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_loop",
      description: "Get whether the global loop is enabled",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_loop_start",
      description: "Get the global loop start position in beats",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_loop_length",
      description: "Get the global loop length in beats",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_metronome",
      description: "Get whether the metronome is on",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_record_mode",
      description: "Get the current record mode",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_session_record",
      description: "Get session record state",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_arrangement_overdub",
      description: "Get arrangement overdub state",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_groove_amount",
      description: "Get the global groove amount",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_clip_trigger_quantization",
      description: "Get the clip trigger quantization setting",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_midi_recording_quantization",
      description: "Get the MIDI recording quantization setting",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_punch_in",
      description: "Get punch-in state",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_punch_out",
      description: "Get punch-out state",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_can_undo",
      description: "Get whether undo is available",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_can_redo",
      description: "Get whether redo is available",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_root_note",
      description: "Get the root note of the current scale",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_scale_name",
      description: "Get the name of the current scale",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_num_tracks",
      description: "Get the total number of tracks",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_num_scenes",
      description: "Get the total number of scenes",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_track_names",
      description: "Get names of tracks in a range",
      inputSchema: {
        type: "object",
        properties: {
          index_min: { type: "integer" },
          index_max: { type: "integer" },
        },
        required: ["index_min", "index_max"],
      },
    },
    {
      name: "get_cue_points",
      description: "Get all cue point names and times",
      inputSchema: { type: "object", properties: {} },
    },

    // ── Song – setters ────────────────────────────────────────────────────────
    {
      name: "set_tempo",
      description: "Set the BPM of the session",
      inputSchema: {
        type: "object",
        properties: { bpm: { type: "number" } },
        required: ["bpm"],
      },
    },
    {
      name: "set_current_song_time",
      description: "Set the playback position in beats",
      inputSchema: {
        type: "object",
        properties: { time: { type: "number" } },
        required: ["time"],
      },
    },
    {
      name: "set_signature_numerator",
      description: "Set the time signature numerator",
      inputSchema: {
        type: "object",
        properties: { numerator: { type: "integer" } },
        required: ["numerator"],
      },
    },
    {
      name: "set_signature_denominator",
      description: "Set the time signature denominator",
      inputSchema: {
        type: "object",
        properties: { denominator: { type: "integer" } },
        required: ["denominator"],
      },
    },
    {
      name: "set_loop",
      description: "Enable or disable the global loop",
      inputSchema: {
        type: "object",
        properties: { enabled: { type: "integer", description: "1 = on, 0 = off" } },
        required: ["enabled"],
      },
    },
    {
      name: "set_loop_start",
      description: "Set the global loop start position in beats",
      inputSchema: {
        type: "object",
        properties: { loop_start: { type: "number" } },
        required: ["loop_start"],
      },
    },
    {
      name: "set_loop_length",
      description: "Set the global loop length in beats",
      inputSchema: {
        type: "object",
        properties: { loop_length: { type: "number" } },
        required: ["loop_length"],
      },
    },
    {
      name: "set_metronome",
      description: "Enable or disable the metronome",
      inputSchema: {
        type: "object",
        properties: { enabled: { type: "integer", description: "1 = on, 0 = off" } },
        required: ["enabled"],
      },
    },
    {
      name: "set_record_mode",
      description: "Set the record mode",
      inputSchema: {
        type: "object",
        properties: { record_mode: { type: "integer" } },
        required: ["record_mode"],
      },
    },
    {
      name: "set_session_record",
      description: "Enable or disable session record",
      inputSchema: {
        type: "object",
        properties: { enabled: { type: "integer" } },
        required: ["enabled"],
      },
    },
    {
      name: "set_arrangement_overdub",
      description: "Enable or disable arrangement overdub",
      inputSchema: {
        type: "object",
        properties: { enabled: { type: "integer" } },
        required: ["enabled"],
      },
    },
    {
      name: "set_groove_amount",
      description: "Set the global groove amount (0.0–1.0)",
      inputSchema: {
        type: "object",
        properties: { amount: { type: "number" } },
        required: ["amount"],
      },
    },
    {
      name: "set_clip_trigger_quantization",
      description: "Set the clip trigger quantization",
      inputSchema: {
        type: "object",
        properties: { quantization: { type: "integer" } },
        required: ["quantization"],
      },
    },
    {
      name: "set_midi_recording_quantization",
      description: "Set the MIDI recording quantization",
      inputSchema: {
        type: "object",
        properties: { quantization: { type: "integer" } },
        required: ["quantization"],
      },
    },
    {
      name: "set_punch_in",
      description: "Enable or disable punch-in",
      inputSchema: {
        type: "object",
        properties: { enabled: { type: "integer" } },
        required: ["enabled"],
      },
    },
    {
      name: "set_punch_out",
      description: "Enable or disable punch-out",
      inputSchema: {
        type: "object",
        properties: { enabled: { type: "integer" } },
        required: ["enabled"],
      },
    },

    // ── View ──────────────────────────────────────────────────────────────────
    {
      name: "get_selected_scene",
      description: "Get the index of the currently selected scene",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_selected_track",
      description: "Get the index of the currently selected track",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_selected_clip",
      description: "Get the track and scene index of the currently selected clip",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "set_selected_scene",
      description: "Select a scene by index",
      inputSchema: {
        type: "object",
        properties: { scene_index: { type: "integer" } },
        required: ["scene_index"],
      },
    },
    {
      name: "set_selected_track",
      description: "Select a track by index",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_selected_clip",
      description: "Select a clip by track and scene index",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          scene_index: { type: "integer" },
        },
        required: ["track_index", "scene_index"],
      },
    },

    // ── Track ─────────────────────────────────────────────────────────────────
    {
      name: "stop_track_clips",
      description: "Stop all clips playing on a track",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "get_track_name",
      description: "Get the name of a track",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_name",
      description: "Set the name of a track",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          name: { type: "string" },
        },
        required: ["track_index", "name"],
      },
    },
    {
      name: "get_track_volume",
      description: "Get the volume of a track (0.0–1.0)",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_volume",
      description: "Set the volume of a track (0.0–1.0)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          volume: { type: "number" },
        },
        required: ["track_index", "volume"],
      },
    },
    {
      name: "get_track_panning",
      description: "Get the panning of a track (-1.0 to 1.0)",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_panning",
      description: "Set the panning of a track (-1.0 to 1.0)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          panning: { type: "number" },
        },
        required: ["track_index", "panning"],
      },
    },
    {
      name: "get_track_mute",
      description: "Get whether a track is muted",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_mute",
      description: "Mute or unmute a track",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          mute: { type: "integer", description: "1 = muted, 0 = unmuted" },
        },
        required: ["track_index", "mute"],
      },
    },
    {
      name: "get_track_solo",
      description: "Get whether a track is soloed",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_solo",
      description: "Solo or unsolo a track",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          solo: { type: "integer", description: "1 = soloed, 0 = not soloed" },
        },
        required: ["track_index", "solo"],
      },
    },
    {
      name: "get_track_arm",
      description: "Get whether a track is armed for recording",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_arm",
      description: "Arm or disarm a track for recording",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          arm: { type: "integer", description: "1 = armed, 0 = disarmed" },
        },
        required: ["track_index", "arm"],
      },
    },
    {
      name: "get_track_color",
      description: "Get the color of a track (as integer)",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_color",
      description: "Set the color of a track (as integer)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          color: { type: "integer" },
        },
        required: ["track_index", "color"],
      },
    },
    {
      name: "get_track_color_index",
      description: "Get the color index of a track",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_color_index",
      description: "Set the color index of a track",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          color_index: { type: "integer" },
        },
        required: ["track_index", "color_index"],
      },
    },
    {
      name: "get_track_send",
      description: "Get a send level on a track",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          send_index: { type: "integer" },
        },
        required: ["track_index", "send_index"],
      },
    },
    {
      name: "set_track_send",
      description: "Set a send level on a track (0.0–1.0)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          send_index: { type: "integer" },
          value: { type: "number" },
        },
        required: ["track_index", "send_index", "value"],
      },
    },
    {
      name: "get_track_fold_state",
      description: "Get whether a group track is folded",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "set_track_fold_state",
      description: "Fold or unfold a group track",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          fold_state: { type: "integer", description: "1 = folded, 0 = unfolded" },
        },
        required: ["track_index", "fold_state"],
      },
    },
    {
      name: "get_track_clips_name",
      description: "Get the names of all clips on a track",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "get_track_num_devices",
      description: "Get the number of devices on a track",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },
    {
      name: "get_track_devices_name",
      description: "Get the names of all devices on a track",
      inputSchema: {
        type: "object",
        properties: { track_index: { type: "integer" } },
        required: ["track_index"],
      },
    },

    // ── Clip Slot ─────────────────────────────────────────────────────────────
    {
      name: "fire_clip_slot",
      description: "Fire (trigger) a clip slot — plays clip if present, stops if already playing",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "create_clip",
      description: "Create a blank MIDI clip in a clip slot",
      inputSchema: {
        type: "object",
        properties: {
          track: { type: "integer", description: "Track index (0-based)" },
          slot: { type: "integer", description: "Clip slot index (0-based)" },
          length: { type: "number", description: "Clip length in bars" },
        },
        required: ["track", "slot", "length"],
      },
    },
    {
      name: "delete_clip",
      description: "Delete the clip in a clip slot",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "get_clip_slot_has_clip",
      description: "Check whether a clip slot contains a clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "duplicate_clip_to",
      description: "Duplicate a clip to another slot",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          target_track_index: { type: "integer" },
          target_clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index", "target_track_index", "target_clip_index"],
      },
    },

    // ── Clip ──────────────────────────────────────────────────────────────────
    {
      name: "fire_clip",
      description: "Start playback of a specific clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "stop_clip",
      description: "Stop playback of a specific clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "add_note",
      description: "Add a MIDI note to a clip",
      inputSchema: {
        type: "object",
        properties: {
          track: { type: "integer" },
          slot: { type: "integer" },
          pitch: { type: "integer", description: "MIDI note number (0-127)" },
          start: { type: "number", description: "Start time in beats" },
          duration: { type: "number", description: "Duration in beats" },
          velocity: { type: "integer", description: "Velocity (0-127), default 100" },
          mute: { type: "integer", description: "0 = audible, 1 = muted" },
        },
        required: ["track", "slot", "pitch", "start", "duration"],
      },
    },
    {
      name: "get_clip_notes",
      description: "Get all MIDI notes in a clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "remove_clip_notes",
      description: "Remove notes from a clip within a pitch and time range",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          pitch_min: { type: "integer", description: "Min pitch (0-127)" },
          pitch_max: { type: "integer", description: "Max pitch (0-127)" },
          time_min: { type: "number", description: "Start of time range in beats" },
          time_max: { type: "number", description: "End of time range in beats" },
        },
        required: ["track_index", "clip_index", "pitch_min", "pitch_max", "time_min", "time_max"],
      },
    },
    {
      name: "duplicate_loop",
      description: "Duplicate the loop contents of a clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "get_clip_name",
      description: "Get the name of a clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_name",
      description: "Set the name of a clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          name: { type: "string" },
        },
        required: ["track_index", "clip_index", "name"],
      },
    },
    {
      name: "get_clip_color",
      description: "Get the color of a clip (as integer)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_color",
      description: "Set the color of a clip (as integer)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          color: { type: "integer" },
        },
        required: ["track_index", "clip_index", "color"],
      },
    },
    {
      name: "get_clip_length",
      description: "Get the length of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "get_clip_loop_start",
      description: "Get the loop start position of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_loop_start",
      description: "Set the loop start position of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          loop_start: { type: "number" },
        },
        required: ["track_index", "clip_index", "loop_start"],
      },
    },
    {
      name: "get_clip_loop_end",
      description: "Get the loop end position of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_loop_end",
      description: "Set the loop end position of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          loop_end: { type: "number" },
        },
        required: ["track_index", "clip_index", "loop_end"],
      },
    },
    {
      name: "get_clip_pitch_coarse",
      description: "Get the coarse pitch transpose of a clip in semitones",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_pitch_coarse",
      description: "Set the coarse pitch transpose of a clip in semitones",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          semitones: { type: "integer" },
        },
        required: ["track_index", "clip_index", "semitones"],
      },
    },
    {
      name: "get_clip_pitch_fine",
      description: "Get the fine pitch transpose of a clip in cents",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_pitch_fine",
      description: "Set the fine pitch transpose of a clip in cents",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          cents: { type: "number" },
        },
        required: ["track_index", "clip_index", "cents"],
      },
    },
    {
      name: "get_clip_gain",
      description: "Get the gain of an audio clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_gain",
      description: "Set the gain of an audio clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          gain: { type: "number" },
        },
        required: ["track_index", "clip_index", "gain"],
      },
    },
    {
      name: "get_clip_muted",
      description: "Get whether a clip is muted",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_muted",
      description: "Mute or unmute a clip",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          muted: { type: "integer", description: "1 = muted, 0 = unmuted" },
        },
        required: ["track_index", "clip_index", "muted"],
      },
    },
    {
      name: "get_clip_is_playing",
      description: "Get whether a clip is currently playing",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "get_clip_is_recording",
      description: "Get whether a clip is currently recording",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "get_clip_start_marker",
      description: "Get the start marker of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_start_marker",
      description: "Set the start marker of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          start_marker: { type: "number" },
        },
        required: ["track_index", "clip_index", "start_marker"],
      },
    },
    {
      name: "get_clip_end_marker",
      description: "Get the end marker of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_end_marker",
      description: "Set the end marker of a clip in beats",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          end_marker: { type: "number" },
        },
        required: ["track_index", "clip_index", "end_marker"],
      },
    },
    {
      name: "get_clip_warp_mode",
      description: "Get the warp mode of an audio clip (0=Beats 1=Tones 2=Texture 3=Re-Pitch 4=Complex 6=Pro)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_warp_mode",
      description: "Set the warp mode of an audio clip (0=Beats 1=Tones 2=Texture 3=Re-Pitch 4=Complex 6=Pro)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          warp_mode: { type: "integer" },
        },
        required: ["track_index", "clip_index", "warp_mode"],
      },
    },
    {
      name: "get_clip_launch_mode",
      description: "Get the launch mode of a clip (0=Trigger 1=Gate 2=Toggle 3=Repeat)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_launch_mode",
      description: "Set the launch mode of a clip (0=Trigger 1=Gate 2=Toggle 3=Repeat)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          launch_mode: { type: "integer" },
        },
        required: ["track_index", "clip_index", "launch_mode"],
      },
    },
    {
      name: "get_clip_launch_quantization",
      description: "Get the launch quantization of a clip (0-14)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["track_index", "clip_index"],
      },
    },
    {
      name: "set_clip_launch_quantization",
      description: "Set the launch quantization of a clip (0-14)",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          launch_quantization: { type: "integer" },
        },
        required: ["track_index", "clip_index", "launch_quantization"],
      },
    },

    // ── Scene ─────────────────────────────────────────────────────────────────
    {
      name: "fire_scene",
      description: "Trigger a scene by index",
      inputSchema: {
        type: "object",
        properties: { scene_index: { type: "integer" } },
        required: ["scene_index"],
      },
    },
    {
      name: "get_scene_name",
      description: "Get the name of a scene",
      inputSchema: {
        type: "object",
        properties: { scene_index: { type: "integer" } },
        required: ["scene_index"],
      },
    },
    {
      name: "set_scene_name",
      description: "Set the name of a scene",
      inputSchema: {
        type: "object",
        properties: {
          scene_index: { type: "integer" },
          name: { type: "string" },
        },
        required: ["scene_index", "name"],
      },
    },
    {
      name: "get_scene_color",
      description: "Get the color of a scene (as integer)",
      inputSchema: {
        type: "object",
        properties: { scene_index: { type: "integer" } },
        required: ["scene_index"],
      },
    },
    {
      name: "set_scene_color",
      description: "Set the color of a scene (as integer)",
      inputSchema: {
        type: "object",
        properties: {
          scene_index: { type: "integer" },
          color: { type: "integer" },
        },
        required: ["scene_index", "color"],
      },
    },
    {
      name: "get_scene_tempo",
      description: "Get the tempo of a scene (0 if not set)",
      inputSchema: {
        type: "object",
        properties: { scene_index: { type: "integer" } },
        required: ["scene_index"],
      },
    },
    {
      name: "set_scene_tempo",
      description: "Set the tempo of a scene",
      inputSchema: {
        type: "object",
        properties: {
          scene_index: { type: "integer" },
          tempo: { type: "number" },
        },
        required: ["scene_index", "tempo"],
      },
    },
    {
      name: "get_scene_is_empty",
      description: "Check whether a scene has no clips",
      inputSchema: {
        type: "object",
        properties: { scene_index: { type: "integer" } },
        required: ["scene_index"],
      },
    },

    // ── Device ────────────────────────────────────────────────────────────────
    {
      name: "get_device_name",
      description: "Get the name of a device on a track",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          device_index: { type: "integer" },
        },
        required: ["track_index", "device_index"],
      },
    },
    {
      name: "get_device_parameters_name",
      description: "Get all parameter names of a device",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          device_index: { type: "integer" },
        },
        required: ["track_index", "device_index"],
      },
    },
    {
      name: "get_device_parameters_value",
      description: "Get all parameter values of a device",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          device_index: { type: "integer" },
        },
        required: ["track_index", "device_index"],
      },
    },
    {
      name: "get_device_parameter_value",
      description: "Get a single parameter value of a device",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          device_index: { type: "integer" },
          parameter_index: { type: "integer" },
        },
        required: ["track_index", "device_index", "parameter_index"],
      },
    },
    {
      name: "set_device_parameter_value",
      description: "Set a single parameter value of a device",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          device_index: { type: "integer" },
          parameter_index: { type: "integer" },
          value: { type: "number" },
        },
        required: ["track_index", "device_index", "parameter_index", "value"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // ── Application ─────────────────────────────────────────────────────────────
  if (name === "test") {
    const result = await sendAndWait("/live/test");
    const val = extractArgs(result);
    return ok(val ? String(val[0]) : "ok");
  }
  if (name === "get_version") {
    const result = await sendAndWait("/live/application/get/version");
    const val = extractArgs(result);
    return ok(val ? `Ableton Live ${val[0]}.${val[1]}` : "unknown");
  }
  if (name === "show_message") {
    send("/live/api/show_message", [s(args.message)]);
    return ok(`Message shown: ${args.message}`);
  }
  if (name === "get_log_level") {
    const result = await sendAndWait("/live/api/get/log_level");
    const val = extractArgs(result);
    return ok(val ? String(val[0]) : "unknown");
  }
  if (name === "set_log_level") {
    send("/live/api/set/log_level", [s(args.level)]);
    return ok(`Log level set to ${args.level}`);
  }

  // ── Song – transport ─────────────────────────────────────────────────────────
  if (name === "play") {
    send("/live/song/start_playing");
    return ok("Playback started");
  }
  if (name === "stop") {
    send("/live/song/stop_playing");
    return ok("Playback stopped");
  }
  if (name === "continue_playing") {
    send("/live/song/continue_playing");
    return ok("Playback resumed");
  }
  if (name === "tap_tempo") {
    send("/live/song/tap_tempo");
    return ok("Tempo tapped");
  }
  if (name === "undo") {
    send("/live/song/undo");
    return ok("Undo");
  }
  if (name === "redo") {
    send("/live/song/redo");
    return ok("Redo");
  }
  if (name === "capture_midi") {
    send("/live/song/capture_midi");
    return ok("MIDI captured");
  }
  if (name === "stop_all_clips") {
    send("/live/song/stop_all_clips");
    return ok("All clips stopped");
  }
  if (name === "trigger_session_record") {
    send("/live/song/trigger_session_record");
    return ok("Session record triggered");
  }
  if (name === "jump_by") {
    send("/live/song/jump_by", [f(args.beats)]);
    return ok(`Jumped by ${args.beats} beats`);
  }
  if (name === "jump_to_next_cue") {
    send("/live/song/jump_to_next_cue");
    return ok("Jumped to next cue");
  }
  if (name === "jump_to_prev_cue") {
    send("/live/song/jump_to_prev_cue");
    return ok("Jumped to previous cue");
  }

  // ── Song – tracks / scenes ───────────────────────────────────────────────────
  if (name === "create_midi_track") {
    send("/live/song/create_midi_track", [i(args.index)]);
    return ok(`MIDI track created at index ${args.index}`);
  }
  if (name === "create_audio_track") {
    send("/live/song/create_audio_track", [i(args.index)]);
    return ok(`Audio track created at index ${args.index}`);
  }
  if (name === "create_return_track") {
    send("/live/song/create_return_track");
    return ok("Return track created");
  }
  if (name === "delete_track") {
    send("/live/song/delete_track", [i(args.track_index)]);
    return ok(`Track ${args.track_index} deleted`);
  }
  if (name === "delete_return_track") {
    send("/live/song/delete_return_track", [i(args.track_index)]);
    return ok(`Return track ${args.track_index} deleted`);
  }
  if (name === "duplicate_track") {
    send("/live/song/duplicate_track", [i(args.track_index)]);
    return ok(`Track ${args.track_index} duplicated`);
  }
  if (name === "create_scene") {
    send("/live/song/create_scene", [i(args.index)]);
    return ok(`Scene created at index ${args.index}`);
  }
  if (name === "delete_scene") {
    send("/live/song/delete_scene", [i(args.scene_index)]);
    return ok(`Scene ${args.scene_index} deleted`);
  }
  if (name === "duplicate_scene") {
    send("/live/song/duplicate_scene", [i(args.scene_index)]);
    return ok(`Scene ${args.scene_index} duplicated`);
  }

  // ── Song – getters ───────────────────────────────────────────────────────────
  if (name === "get_tempo") {
    const result = await sendAndWait("/live/song/get/tempo");
    const val = extractArgs(result);
    return ok(val ? `Tempo: ${val[0]} BPM` : "Tempo: unknown");
  }
  if (name === "get_is_playing") {
    const result = await sendAndWait("/live/song/get/is_playing");
    const val = extractArgs(result);
    return ok(val ? `Is playing: ${val[0]}` : "Is playing: unknown");
  }
  if (name === "get_current_song_time") {
    const result = await sendAndWait("/live/song/get/current_song_time");
    const val = extractArgs(result);
    return ok(val ? `Current time: ${val[0]} beats` : "Current time: unknown");
  }
  if (name === "get_song_length") {
    const result = await sendAndWait("/live/song/get/song_length");
    const val = extractArgs(result);
    return ok(val ? `Song length: ${val[0]} beats` : "Song length: unknown");
  }
  if (name === "get_signature_numerator") {
    const result = await sendAndWait("/live/song/get/signature_numerator");
    const val = extractArgs(result);
    return ok(val ? `Numerator: ${val[0]}` : "Numerator: unknown");
  }
  if (name === "get_signature_denominator") {
    const result = await sendAndWait("/live/song/get/signature_denominator");
    const val = extractArgs(result);
    return ok(val ? `Denominator: ${val[0]}` : "Denominator: unknown");
  }
  if (name === "get_loop") {
    const result = await sendAndWait("/live/song/get/loop");
    const val = extractArgs(result);
    return ok(val ? `Loop: ${val[0] ? "on" : "off"}` : "Loop: unknown");
  }
  if (name === "get_loop_start") {
    const result = await sendAndWait("/live/song/get/loop_start");
    const val = extractArgs(result);
    return ok(val ? `Loop start: ${val[0]} beats` : "Loop start: unknown");
  }
  if (name === "get_loop_length") {
    const result = await sendAndWait("/live/song/get/loop_length");
    const val = extractArgs(result);
    return ok(val ? `Loop length: ${val[0]} beats` : "Loop length: unknown");
  }
  if (name === "get_metronome") {
    const result = await sendAndWait("/live/song/get/metronome");
    const val = extractArgs(result);
    return ok(val ? `Metronome: ${val[0] ? "on" : "off"}` : "Metronome: unknown");
  }
  if (name === "get_record_mode") {
    const result = await sendAndWait("/live/song/get/record_mode");
    const val = extractArgs(result);
    return ok(val ? `Record mode: ${val[0]}` : "Record mode: unknown");
  }
  if (name === "get_session_record") {
    const result = await sendAndWait("/live/song/get/session_record");
    const val = extractArgs(result);
    return ok(val ? `Session record: ${val[0]}` : "Session record: unknown");
  }
  if (name === "get_arrangement_overdub") {
    const result = await sendAndWait("/live/song/get/arrangement_overdub");
    const val = extractArgs(result);
    return ok(val ? `Arrangement overdub: ${val[0]}` : "Arrangement overdub: unknown");
  }
  if (name === "get_groove_amount") {
    const result = await sendAndWait("/live/song/get/groove_amount");
    const val = extractArgs(result);
    return ok(val ? `Groove amount: ${val[0]}` : "Groove amount: unknown");
  }
  if (name === "get_clip_trigger_quantization") {
    const result = await sendAndWait("/live/song/get/clip_trigger_quantization");
    const val = extractArgs(result);
    return ok(val ? `Clip trigger quantization: ${val[0]}` : "Clip trigger quantization: unknown");
  }
  if (name === "get_midi_recording_quantization") {
    const result = await sendAndWait("/live/song/get/midi_recording_quantization");
    const val = extractArgs(result);
    return ok(val ? `MIDI recording quantization: ${val[0]}` : "MIDI recording quantization: unknown");
  }
  if (name === "get_punch_in") {
    const result = await sendAndWait("/live/song/get/punch_in");
    const val = extractArgs(result);
    return ok(val ? `Punch in: ${val[0]}` : "Punch in: unknown");
  }
  if (name === "get_punch_out") {
    const result = await sendAndWait("/live/song/get/punch_out");
    const val = extractArgs(result);
    return ok(val ? `Punch out: ${val[0]}` : "Punch out: unknown");
  }
  if (name === "get_can_undo") {
    const result = await sendAndWait("/live/song/get/can_undo");
    const val = extractArgs(result);
    return ok(val ? `Can undo: ${val[0]}` : "Can undo: unknown");
  }
  if (name === "get_can_redo") {
    const result = await sendAndWait("/live/song/get/can_redo");
    const val = extractArgs(result);
    return ok(val ? `Can redo: ${val[0]}` : "Can redo: unknown");
  }
  if (name === "get_root_note") {
    const result = await sendAndWait("/live/song/get/root_note");
    const val = extractArgs(result);
    return ok(val ? `Root note: ${val[0]}` : "Root note: unknown");
  }
  if (name === "get_scale_name") {
    const result = await sendAndWait("/live/song/get/scale_name");
    const val = extractArgs(result);
    return ok(val ? `Scale: ${val[0]}` : "Scale: unknown");
  }
  if (name === "get_num_tracks") {
    const result = await sendAndWait("/live/song/get/num_tracks");
    const val = extractArgs(result);
    return ok(val ? `Tracks: ${val[0]}` : "Tracks: unknown");
  }
  if (name === "get_num_scenes") {
    const result = await sendAndWait("/live/song/get/num_scenes");
    const val = extractArgs(result);
    return ok(val ? `Scenes: ${val[0]}` : "Scenes: unknown");
  }
  if (name === "get_track_names") {
    const result = await sendAndWait("/live/song/get/track_names", [i(args.index_min), i(args.index_max)]);
    const val = extractArgs(result);
    return ok(val ? `Track names: ${val.join(", ")}` : "Track names: unknown");
  }
  if (name === "get_cue_points") {
    const result = await sendAndWait("/live/song/get/cue_points");
    const val = extractArgs(result);
    return ok(val ? `Cue points: ${val.join(", ")}` : "No cue points");
  }

  // ── Song – setters ───────────────────────────────────────────────────────────
  if (name === "set_tempo") {
    send("/live/song/set/tempo", [f(args.bpm)]);
    return ok(`Tempo set to ${args.bpm} BPM`);
  }
  if (name === "set_current_song_time") {
    send("/live/song/set/current_song_time", [f(args.time)]);
    return ok(`Song time set to ${args.time} beats`);
  }
  if (name === "set_signature_numerator") {
    send("/live/song/set/signature_numerator", [i(args.numerator)]);
    return ok(`Numerator set to ${args.numerator}`);
  }
  if (name === "set_signature_denominator") {
    send("/live/song/set/signature_denominator", [i(args.denominator)]);
    return ok(`Denominator set to ${args.denominator}`);
  }
  if (name === "set_loop") {
    send("/live/song/set/loop", [i(args.enabled)]);
    return ok(`Loop ${args.enabled ? "enabled" : "disabled"}`);
  }
  if (name === "set_loop_start") {
    send("/live/song/set/loop_start", [f(args.loop_start)]);
    return ok(`Loop start set to ${args.loop_start} beats`);
  }
  if (name === "set_loop_length") {
    send("/live/song/set/loop_length", [f(args.loop_length)]);
    return ok(`Loop length set to ${args.loop_length} beats`);
  }
  if (name === "set_metronome") {
    send("/live/song/set/metronome", [i(args.enabled)]);
    return ok(`Metronome ${args.enabled ? "on" : "off"}`);
  }
  if (name === "set_record_mode") {
    send("/live/song/set/record_mode", [i(args.record_mode)]);
    return ok(`Record mode set to ${args.record_mode}`);
  }
  if (name === "set_session_record") {
    send("/live/song/set/session_record", [i(args.enabled)]);
    return ok(`Session record ${args.enabled ? "on" : "off"}`);
  }
  if (name === "set_arrangement_overdub") {
    send("/live/song/set/arrangement_overdub", [i(args.enabled)]);
    return ok(`Arrangement overdub ${args.enabled ? "on" : "off"}`);
  }
  if (name === "set_groove_amount") {
    send("/live/song/set/groove_amount", [f(args.amount)]);
    return ok(`Groove amount set to ${args.amount}`);
  }
  if (name === "set_clip_trigger_quantization") {
    send("/live/song/set/clip_trigger_quantization", [i(args.quantization)]);
    return ok(`Clip trigger quantization set to ${args.quantization}`);
  }
  if (name === "set_midi_recording_quantization") {
    send("/live/song/set/midi_recording_quantization", [i(args.quantization)]);
    return ok(`MIDI recording quantization set to ${args.quantization}`);
  }
  if (name === "set_punch_in") {
    send("/live/song/set/punch_in", [i(args.enabled)]);
    return ok(`Punch in ${args.enabled ? "on" : "off"}`);
  }
  if (name === "set_punch_out") {
    send("/live/song/set/punch_out", [i(args.enabled)]);
    return ok(`Punch out ${args.enabled ? "on" : "off"}`);
  }

  // ── View ─────────────────────────────────────────────────────────────────────
  if (name === "get_selected_scene") {
    const result = await sendAndWait("/live/view/get/selected_scene");
    const val = extractArgs(result);
    return ok(val ? `Selected scene: ${val[0]}` : "Selected scene: unknown");
  }
  if (name === "get_selected_track") {
    const result = await sendAndWait("/live/view/get/selected_track");
    const val = extractArgs(result);
    return ok(val ? `Selected track: ${val[0]}` : "Selected track: unknown");
  }
  if (name === "get_selected_clip") {
    const result = await sendAndWait("/live/view/get/selected_clip");
    const val = extractArgs(result);
    return ok(val ? `Selected clip: track ${val[0]}, scene ${val[1]}` : "Selected clip: unknown");
  }
  if (name === "set_selected_scene") {
    send("/live/view/set/selected_scene", [i(args.scene_index)]);
    return ok(`Selected scene ${args.scene_index}`);
  }
  if (name === "set_selected_track") {
    send("/live/view/set/selected_track", [i(args.track_index)]);
    return ok(`Selected track ${args.track_index}`);
  }
  if (name === "set_selected_clip") {
    send("/live/view/set/selected_clip", [i(args.track_index), i(args.scene_index)]);
    return ok(`Selected clip at track ${args.track_index}, scene ${args.scene_index}`);
  }

  // ── Track ────────────────────────────────────────────────────────────────────
  if (name === "stop_track_clips") {
    send("/live/track/stop_all_clips", [i(args.track_index)]);
    return ok(`All clips stopped on track ${args.track_index}`);
  }
  if (name === "get_track_name") {
    const result = await sendAndWait("/live/track/get/name", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} name: ${val[1]}` : "Name: unknown");
  }
  if (name === "set_track_name") {
    send("/live/track/set/name", [i(args.track_index), s(args.name)]);
    return ok(`Track ${args.track_index} renamed to ${args.name}`);
  }
  if (name === "get_track_volume") {
    const result = await sendAndWait("/live/track/get/volume", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} volume: ${val[1]}` : "Volume: unknown");
  }
  if (name === "set_track_volume") {
    send("/live/track/set/volume", [i(args.track_index), f(args.volume)]);
    return ok(`Track ${args.track_index} volume set to ${args.volume}`);
  }
  if (name === "get_track_panning") {
    const result = await sendAndWait("/live/track/get/panning", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} panning: ${val[1]}` : "Panning: unknown");
  }
  if (name === "set_track_panning") {
    send("/live/track/set/panning", [i(args.track_index), f(args.panning)]);
    return ok(`Track ${args.track_index} panning set to ${args.panning}`);
  }
  if (name === "get_track_mute") {
    const result = await sendAndWait("/live/track/get/mute", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} mute: ${val[1]}` : "Mute: unknown");
  }
  if (name === "set_track_mute") {
    send("/live/track/set/mute", [i(args.track_index), i(args.mute)]);
    return ok(`Track ${args.track_index} ${args.mute ? "muted" : "unmuted"}`);
  }
  if (name === "get_track_solo") {
    const result = await sendAndWait("/live/track/get/solo", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} solo: ${val[1]}` : "Solo: unknown");
  }
  if (name === "set_track_solo") {
    send("/live/track/set/solo", [i(args.track_index), i(args.solo)]);
    return ok(`Track ${args.track_index} ${args.solo ? "soloed" : "unsoloed"}`);
  }
  if (name === "get_track_arm") {
    const result = await sendAndWait("/live/track/get/arm", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} arm: ${val[1]}` : "Arm: unknown");
  }
  if (name === "set_track_arm") {
    send("/live/track/set/arm", [i(args.track_index), i(args.arm)]);
    return ok(`Track ${args.track_index} ${args.arm ? "armed" : "disarmed"}`);
  }
  if (name === "get_track_color") {
    const result = await sendAndWait("/live/track/get/color", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} color: ${val[1]}` : "Color: unknown");
  }
  if (name === "set_track_color") {
    send("/live/track/set/color", [i(args.track_index), i(args.color)]);
    return ok(`Track ${args.track_index} color set to ${args.color}`);
  }
  if (name === "get_track_color_index") {
    const result = await sendAndWait("/live/track/get/color_index", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} color index: ${val[1]}` : "Color index: unknown");
  }
  if (name === "set_track_color_index") {
    send("/live/track/set/color_index", [i(args.track_index), i(args.color_index)]);
    return ok(`Track ${args.track_index} color index set to ${args.color_index}`);
  }
  if (name === "get_track_send") {
    const result = await sendAndWait("/live/track/get/send", [i(args.track_index), i(args.send_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} send ${args.send_index}: ${val[2]}` : "Send: unknown");
  }
  if (name === "set_track_send") {
    send("/live/track/set/send", [i(args.track_index), i(args.send_index), f(args.value)]);
    return ok(`Track ${args.track_index} send ${args.send_index} set to ${args.value}`);
  }
  if (name === "get_track_fold_state") {
    const result = await sendAndWait("/live/track/get/fold_state", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Track ${args.track_index} fold state: ${val[1]}` : "Fold state: unknown");
  }
  if (name === "set_track_fold_state") {
    send("/live/track/set/fold_state", [i(args.track_index), i(args.fold_state)]);
    return ok(`Track ${args.track_index} ${args.fold_state ? "folded" : "unfolded"}`);
  }
  if (name === "get_track_clips_name") {
    const result = await sendAndWait("/live/track/get/clips/name", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Clips: ${val.slice(1).join(", ")}` : "Clips: none");
  }
  if (name === "get_track_num_devices") {
    const result = await sendAndWait("/live/track/get/num_devices", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Devices on track ${args.track_index}: ${val[1]}` : "Devices: unknown");
  }
  if (name === "get_track_devices_name") {
    const result = await sendAndWait("/live/track/get/devices/name", [i(args.track_index)]);
    const val = extractArgs(result);
    return ok(val ? `Device names: ${val.slice(1).join(", ")}` : "Device names: unknown");
  }

  // ── Clip Slot ────────────────────────────────────────────────────────────────
  if (name === "fire_clip_slot") {
    send("/live/clip_slot/fire", [i(args.track_index), i(args.clip_index)]);
    return ok(`Clip slot fired: track ${args.track_index}, slot ${args.clip_index}`);
  }
  if (name === "create_clip") {
    send("/live/clip_slot/create_clip", [i(args.track), i(args.slot), f(args.length * 4)]);
    return ok(`Created clip on track ${args.track}, slot ${args.slot}`);
  }
  if (name === "delete_clip") {
    send("/live/clip_slot/delete_clip", [i(args.track_index), i(args.clip_index)]);
    return ok(`Clip deleted at track ${args.track_index}, slot ${args.clip_index}`);
  }
  if (name === "get_clip_slot_has_clip") {
    const result = await sendAndWait("/live/clip_slot/get/has_clip", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Has clip: ${val[2]}` : "Has clip: unknown");
  }
  if (name === "duplicate_clip_to") {
    send("/live/clip_slot/duplicate_clip_to", [
      i(args.track_index), i(args.clip_index),
      i(args.target_track_index), i(args.target_clip_index),
    ]);
    return ok(`Clip duplicated to track ${args.target_track_index}, slot ${args.target_clip_index}`);
  }

  // ── Clip ─────────────────────────────────────────────────────────────────────
  if (name === "fire_clip") {
    send("/live/clip/fire", [i(args.track_index), i(args.clip_index)]);
    return ok(`Clip started: track ${args.track_index}, slot ${args.clip_index}`);
  }
  if (name === "stop_clip") {
    send("/live/clip/stop", [i(args.track_index), i(args.clip_index)]);
    return ok(`Clip stopped: track ${args.track_index}, slot ${args.clip_index}`);
  }
  if (name === "add_note") {
    send("/live/clip/add/notes", [
      i(args.track), i(args.slot),
      i(args.pitch), f(args.start), f(args.duration),
      i(args.velocity ?? 100), i(args.mute ?? 0),
    ]);
    return ok(`Added note ${args.pitch} to clip`);
  }
  if (name === "get_clip_notes") {
    const result = await sendAndWait("/live/clip/get/notes", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    if (!val || val.length <= 2) return ok("No notes");
    const notes = [];
    for (let i2 = 2; i2 < val.length; i2 += 5) {
      notes.push(`pitch=${val[i2]} start=${val[i2+1]} dur=${val[i2+2]} vel=${val[i2+3]}`);
    }
    return ok(`Notes:\n${notes.join("\n")}`);
  }
  if (name === "remove_clip_notes") {
    send("/live/clip/remove/notes", [
      i(args.track_index), i(args.clip_index),
      i(args.pitch_min), i(args.pitch_max),
      f(args.time_min), f(args.time_max),
    ]);
    return ok("Notes removed");
  }
  if (name === "duplicate_loop") {
    send("/live/clip/duplicate_loop", [i(args.track_index), i(args.clip_index)]);
    return ok("Loop duplicated");
  }
  if (name === "get_clip_name") {
    const result = await sendAndWait("/live/clip/get/name", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Clip name: ${val[2]}` : "Clip name: unknown");
  }
  if (name === "set_clip_name") {
    send("/live/clip/set/name", [i(args.track_index), i(args.clip_index), s(args.name)]);
    return ok(`Clip renamed to ${args.name}`);
  }
  if (name === "get_clip_color") {
    const result = await sendAndWait("/live/clip/get/color", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Clip color: ${val[2]}` : "Clip color: unknown");
  }
  if (name === "set_clip_color") {
    send("/live/clip/set/color", [i(args.track_index), i(args.clip_index), i(args.color)]);
    return ok(`Clip color set to ${args.color}`);
  }
  if (name === "get_clip_length") {
    const result = await sendAndWait("/live/clip/get/length", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Clip length: ${val[2]} beats` : "Clip length: unknown");
  }
  if (name === "get_clip_loop_start") {
    const result = await sendAndWait("/live/clip/get/loop_start", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Loop start: ${val[2]} beats` : "Loop start: unknown");
  }
  if (name === "set_clip_loop_start") {
    send("/live/clip/set/loop_start", [i(args.track_index), i(args.clip_index), f(args.loop_start)]);
    return ok(`Clip loop start set to ${args.loop_start} beats`);
  }
  if (name === "get_clip_loop_end") {
    const result = await sendAndWait("/live/clip/get/loop_end", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Loop end: ${val[2]} beats` : "Loop end: unknown");
  }
  if (name === "set_clip_loop_end") {
    send("/live/clip/set/loop_end", [i(args.track_index), i(args.clip_index), f(args.loop_end)]);
    return ok(`Clip loop end set to ${args.loop_end} beats`);
  }
  if (name === "get_clip_pitch_coarse") {
    const result = await sendAndWait("/live/clip/get/pitch_coarse", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Pitch (coarse): ${val[2]} semitones` : "Pitch (coarse): unknown");
  }
  if (name === "set_clip_pitch_coarse") {
    send("/live/clip/set/pitch_coarse", [i(args.track_index), i(args.clip_index), i(args.semitones)]);
    return ok(`Clip pitch (coarse) set to ${args.semitones} semitones`);
  }
  if (name === "get_clip_pitch_fine") {
    const result = await sendAndWait("/live/clip/get/pitch_fine", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Pitch (fine): ${val[2]} cents` : "Pitch (fine): unknown");
  }
  if (name === "set_clip_pitch_fine") {
    send("/live/clip/set/pitch_fine", [i(args.track_index), i(args.clip_index), f(args.cents)]);
    return ok(`Clip pitch (fine) set to ${args.cents} cents`);
  }
  if (name === "get_clip_gain") {
    const result = await sendAndWait("/live/clip/get/gain", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Clip gain: ${val[2]}` : "Clip gain: unknown");
  }
  if (name === "set_clip_gain") {
    send("/live/clip/set/gain", [i(args.track_index), i(args.clip_index), f(args.gain)]);
    return ok(`Clip gain set to ${args.gain}`);
  }
  if (name === "get_clip_muted") {
    const result = await sendAndWait("/live/clip/get/muted", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Clip muted: ${val[2]}` : "Clip muted: unknown");
  }
  if (name === "set_clip_muted") {
    send("/live/clip/set/muted", [i(args.track_index), i(args.clip_index), i(args.muted)]);
    return ok(`Clip ${args.muted ? "muted" : "unmuted"}`);
  }
  if (name === "get_clip_is_playing") {
    const result = await sendAndWait("/live/clip/get/is_playing", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Is playing: ${val[2]}` : "Is playing: unknown");
  }
  if (name === "get_clip_is_recording") {
    const result = await sendAndWait("/live/clip/get/is_recording", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Is recording: ${val[2]}` : "Is recording: unknown");
  }
  if (name === "get_clip_start_marker") {
    const result = await sendAndWait("/live/clip/get/start_marker", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Start marker: ${val[2]} beats` : "Start marker: unknown");
  }
  if (name === "set_clip_start_marker") {
    send("/live/clip/set/start_marker", [i(args.track_index), i(args.clip_index), f(args.start_marker)]);
    return ok(`Start marker set to ${args.start_marker} beats`);
  }
  if (name === "get_clip_end_marker") {
    const result = await sendAndWait("/live/clip/get/end_marker", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `End marker: ${val[2]} beats` : "End marker: unknown");
  }
  if (name === "set_clip_end_marker") {
    send("/live/clip/set/end_marker", [i(args.track_index), i(args.clip_index), f(args.end_marker)]);
    return ok(`End marker set to ${args.end_marker} beats`);
  }
  if (name === "get_clip_warp_mode") {
    const result = await sendAndWait("/live/clip/get/warp_mode", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Warp mode: ${val[2]}` : "Warp mode: unknown");
  }
  if (name === "set_clip_warp_mode") {
    send("/live/clip/set/warp_mode", [i(args.track_index), i(args.clip_index), i(args.warp_mode)]);
    return ok(`Warp mode set to ${args.warp_mode}`);
  }
  if (name === "get_clip_launch_mode") {
    const result = await sendAndWait("/live/clip/get/launch_mode", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Launch mode: ${val[2]}` : "Launch mode: unknown");
  }
  if (name === "set_clip_launch_mode") {
    send("/live/clip/set/launch_mode", [i(args.track_index), i(args.clip_index), i(args.launch_mode)]);
    return ok(`Launch mode set to ${args.launch_mode}`);
  }
  if (name === "get_clip_launch_quantization") {
    const result = await sendAndWait("/live/clip/get/launch_quantization", [i(args.track_index), i(args.clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `Launch quantization: ${val[2]}` : "Launch quantization: unknown");
  }
  if (name === "set_clip_launch_quantization") {
    send("/live/clip/set/launch_quantization", [i(args.track_index), i(args.clip_index), i(args.launch_quantization)]);
    return ok(`Launch quantization set to ${args.launch_quantization}`);
  }

  // ── Scene ────────────────────────────────────────────────────────────────────
  if (name === "fire_scene") {
    send("/live/scene/fire", [i(args.scene_index)]);
    return ok(`Scene ${args.scene_index} fired`);
  }
  if (name === "get_scene_name") {
    const result = await sendAndWait("/live/scene/get/name", [i(args.scene_index)]);
    const val = extractArgs(result);
    return ok(val ? `Scene ${args.scene_index} name: ${val[1]}` : "Scene name: unknown");
  }
  if (name === "set_scene_name") {
    send("/live/scene/set/name", [i(args.scene_index), s(args.name)]);
    return ok(`Scene ${args.scene_index} renamed to ${args.name}`);
  }
  if (name === "get_scene_color") {
    const result = await sendAndWait("/live/scene/get/color", [i(args.scene_index)]);
    const val = extractArgs(result);
    return ok(val ? `Scene ${args.scene_index} color: ${val[1]}` : "Scene color: unknown");
  }
  if (name === "set_scene_color") {
    send("/live/scene/set/color", [i(args.scene_index), i(args.color)]);
    return ok(`Scene ${args.scene_index} color set to ${args.color}`);
  }
  if (name === "get_scene_tempo") {
    const result = await sendAndWait("/live/scene/get/tempo", [i(args.scene_index)]);
    const val = extractArgs(result);
    return ok(val ? `Scene ${args.scene_index} tempo: ${val[1]}` : "Scene tempo: unknown");
  }
  if (name === "set_scene_tempo") {
    send("/live/scene/set/tempo", [i(args.scene_index), f(args.tempo)]);
    return ok(`Scene ${args.scene_index} tempo set to ${args.tempo}`);
  }
  if (name === "get_scene_is_empty") {
    const result = await sendAndWait("/live/scene/get/is_empty", [i(args.scene_index)]);
    const val = extractArgs(result);
    return ok(val ? `Scene ${args.scene_index} is empty: ${val[1]}` : "Is empty: unknown");
  }

  // ── Device ───────────────────────────────────────────────────────────────────
  if (name === "get_device_name") {
    const result = await sendAndWait("/live/device/get/name", [i(args.track_index), i(args.device_index)]);
    const val = extractArgs(result);
    return ok(val ? `Device name: ${val[2]}` : "Device name: unknown");
  }
  if (name === "get_device_parameters_name") {
    const result = await sendAndWait("/live/device/get/parameters/name", [i(args.track_index), i(args.device_index)]);
    const val = extractArgs(result);
    return ok(val ? `Parameters: ${val.slice(2).join(", ")}` : "Parameters: unknown");
  }
  if (name === "get_device_parameters_value") {
    const result = await sendAndWait("/live/device/get/parameters/value", [i(args.track_index), i(args.device_index)]);
    const val = extractArgs(result);
    return ok(val ? `Values: ${val.slice(2).join(", ")}` : "Values: unknown");
  }
  if (name === "get_device_parameter_value") {
    const result = await sendAndWait("/live/device/get/parameter/value", [
      i(args.track_index), i(args.device_index), i(args.parameter_index),
    ]);
    const val = extractArgs(result);
    return ok(val ? `Parameter ${args.parameter_index} value: ${val[3]}` : "Value: unknown");
  }
  if (name === "set_device_parameter_value") {
    send("/live/device/set/parameter/value", [
      i(args.track_index), i(args.device_index), i(args.parameter_index), f(args.value),
    ]);
    return ok(`Parameter ${args.parameter_index} set to ${args.value}`);
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
