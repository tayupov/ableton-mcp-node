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

const pending = {};

oscPort.on("message", (msg) => {
  console.error(`[osc] ${msg.address}`, msg.args);
  const resolve = pending[msg.address];
  if (resolve) {
    delete pending[msg.address];
    resolve(msg.args);
  }
});

oscPort.open();

function sendAndWait(address, args = [], timeout = 300) {
  return new Promise((resolve) => {
    pending[address] = resolve;
    oscPort.send({ address, args });
    setTimeout(() => {
      if (pending[address]) {
        delete pending[address];
        resolve(null);
      }
    }, timeout);
  });
}

// requests: array of { args, key }; getKey extracts the lookup key from response vals
function sendAndCollectMany(address, requests, getKey, timeout = 500) {
  return new Promise((resolve) => {
    const results = {};
    const waiting = new Map(requests.map(r => [r.key, true]));

    const handler = (msg) => {
      if (msg.address !== address) return;
      const vals = extractArgs(msg.args);
      const key = getKey(vals);
      if (waiting.has(key)) {
        results[key] = vals;
        waiting.delete(key);
        if (waiting.size === 0) {
          oscPort.removeListener("message", handler);
          clearTimeout(timer);
          resolve(results);
        }
      }
    };

    oscPort.on("message", handler);
    const timer = setTimeout(() => {
      oscPort.removeListener("message", handler);
      resolve(results);
    }, timeout);

    for (const r of requests) oscPort.send({ address, args: r.args });
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
    {
      name: "test",
      description: "Ping AbletonOSC to confirm it is running",
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
      name: "song_get_many",
      description: "Get multiple song-level properties in one call. Prefer this over calling song_get repeatedly. Same properties as song_get, excluding version, log_level, and track_names.",
      inputSchema: {
        type: "object",
        properties: {
          properties: { type: "array", items: { type: "string" } },
        },
        required: ["properties"],
      },
    },
    {
      name: "song_get",
      description: "Get a song-level property. Use song_get_many when fetching multiple properties. Properties: version, log_level, tempo, is_playing, current_song_time, song_length, signature_numerator, signature_denominator, loop, loop_start, loop_length, metronome, record_mode, session_record, arrangement_overdub, groove_amount, clip_trigger_quantization, midi_recording_quantization, punch_in, punch_out, can_undo, can_redo, root_note, scale_name, num_tracks, num_scenes, cue_points, track_names (requires index_min and index_max).",
      inputSchema: {
        type: "object",
        properties: {
          property: { type: "string" },
          index_min: { type: "integer" },
          index_max: { type: "integer" },
        },
        required: ["property"],
      },
    },
    {
      name: "song_set",
      description: "Set a song-level property. Properties: log_level (string: debug/info/warning/error/critical), tempo (float BPM), current_song_time (float beats), signature_numerator (int), signature_denominator (int), loop (0/1), loop_start (float beats), loop_length (float beats), metronome (0/1), record_mode (int), session_record (0/1), arrangement_overdub (0/1), groove_amount (0.0-1.0), clip_trigger_quantization (int), midi_recording_quantization (int), punch_in (0/1), punch_out (0/1).",
      inputSchema: {
        type: "object",
        properties: {
          property: { type: "string" },
          value: {},
        },
        required: ["property", "value"],
      },
    },
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
      name: "song_action",
      description: "Perform a song-level action. Actions: continue_playing, tap_tempo, capture_midi, stop_all_clips, trigger_session_record, jump_to_next_cue, jump_to_prev_cue, jump_by (requires beats).",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          beats: { type: "number", description: "Required for jump_by" },
        },
        required: ["action"],
      },
    },
    {
      name: "track_manage",
      description: "Create, delete, or duplicate tracks. Actions: create_midi (index), create_audio (index), create_return, delete (index), delete_return (index), duplicate (index), stop_clips (index). index is the insertion point for create or track index for other actions.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          index: { type: "integer" },
        },
        required: ["action"],
      },
    },
    {
      name: "tracks_get",
      description: "Get a property for multiple tracks at once. Prefer this over calling track_get repeatedly. Properties: name, volume, panning, mute, solo, arm, color, color_index, fold_state.",
      inputSchema: {
        type: "object",
        properties: {
          property: { type: "string" },
          index_min: { type: "integer" },
          index_max: { type: "integer" },
        },
        required: ["property", "index_min", "index_max"],
      },
    },
    {
      name: "track_get",
      description: "Get a single track property. Use tracks_get when fetching the same property across multiple tracks. Properties: name, volume, panning, mute, solo, arm, color, color_index, send (requires send_index), fold_state, clips_name, num_devices, devices_name.",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          property: { type: "string" },
          send_index: { type: "integer", description: "Required for send property" },
        },
        required: ["track_index", "property"],
      },
    },
    {
      name: "track_set",
      description: "Set a track property. Properties: name (string), volume (0.0-1.0), panning (-1.0-1.0), mute (0/1), solo (0/1), arm (0/1), color (int), color_index (int), send (requires send_index, value 0.0-1.0), fold_state (0/1).",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          property: { type: "string" },
          value: {},
          send_index: { type: "integer", description: "Required for send property" },
        },
        required: ["track_index", "property", "value"],
      },
    },
    {
      name: "clip_slot",
      description: "Operate on a clip slot. Actions: fire (trigger slot), has_clip (check if slot has a clip), create (create blank MIDI clip, requires length in bars), delete (delete clip), duplicate_to (requires target_track and target_clip).",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          length: { type: "number", description: "Clip length in bars (for create)" },
          target_track: { type: "integer", description: "Target track index (for duplicate_to)" },
          target_clip: { type: "integer", description: "Target clip slot index (for duplicate_to)" },
        },
        required: ["action", "track_index", "clip_index"],
      },
    },
    {
      name: "clips_get",
      description: "Get a property for multiple clips in one call. Prefer this over calling clip_get repeatedly. Same properties as clip_get.",
      inputSchema: {
        type: "object",
        properties: {
          property: { type: "string" },
          clips: {
            type: "array",
            items: {
              type: "object",
              properties: {
                track_index: { type: "integer" },
                clip_index: { type: "integer" },
              },
              required: ["track_index", "clip_index"],
            },
          },
        },
        required: ["property", "clips"],
      },
    },
    {
      name: "clip_get",
      description: "Get a single clip property. Use clips_get when fetching the same property across multiple clips. Properties: name, color, length, loop_start, loop_end, pitch_coarse, pitch_fine, gain, muted, is_playing, is_recording, start_marker, end_marker, warp_mode (0=Beats 1=Tones 2=Texture 3=Re-Pitch 4=Complex 6=Pro), launch_mode (0=Trigger 1=Gate 2=Toggle 3=Repeat), launch_quantization (0-14), notes.",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          property: { type: "string" },
        },
        required: ["track_index", "clip_index", "property"],
      },
    },
    {
      name: "clip_set",
      description: "Set a clip property on one or multiple clips. Pass track_index+clip_index for a single clip, or a clips array to set the same property on many clips at once. Properties: name (string), color (int), loop_start (float beats), loop_end (float beats), pitch_coarse (int semitones), pitch_fine (float cents), gain (float), muted (0/1), start_marker (float beats), end_marker (float beats), warp_mode (int), launch_mode (int), launch_quantization (int).",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          property: { type: "string" },
          value: {},
          clips: {
            type: "array",
            description: "Set the same property on multiple clips at once",
            items: {
              type: "object",
              properties: {
                track_index: { type: "integer" },
                clip_index: { type: "integer" },
                value: {},
              },
              required: ["track_index", "clip_index", "value"],
            },
          },
        },
        required: ["property"],
      },
    },
    {
      name: "clip_action",
      description: "Perform an action on a clip. Actions: fire, stop, duplicate_loop.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
        },
        required: ["action", "track_index", "clip_index"],
      },
    },
    {
      name: "add_notes",
      description: "Add multiple MIDI notes to a clip in one call. Always prefer this over calling add_note repeatedly.",
      inputSchema: {
        type: "object",
        properties: {
          track: { type: "integer" },
          slot: { type: "integer" },
          notes: {
            type: "array",
            description: "Array of notes to add",
            items: {
              type: "object",
              properties: {
                pitch: { type: "integer", description: "MIDI note number (0-127)" },
                start: { type: "number", description: "Start time in beats" },
                duration: { type: "number", description: "Duration in beats" },
                velocity: { type: "integer", description: "Velocity (0-127), default 100" },
                mute: { type: "integer", description: "0 = audible, 1 = muted, default 0" },
              },
              required: ["pitch", "start", "duration"],
            },
          },
        },
        required: ["track", "slot", "notes"],
      },
    },
    {
      name: "add_note",
      description: "Add a single MIDI note to a clip. Use add_notes instead when adding more than one note.",
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
      name: "remove_notes",
      description: "Remove notes from a clip within a pitch and time range",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          clip_index: { type: "integer" },
          pitch_min: { type: "integer" },
          pitch_max: { type: "integer" },
          time_min: { type: "number" },
          time_max: { type: "number" },
        },
        required: ["track_index", "clip_index", "pitch_min", "pitch_max", "time_min", "time_max"],
      },
    },
    {
      name: "scene_manage",
      description: "Create, delete, duplicate, or fire a scene. Actions: create (scene_index = insertion point), delete (scene_index), duplicate (scene_index), fire (scene_index).",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          scene_index: { type: "integer" },
        },
        required: ["action"],
      },
    },
    {
      name: "scene_get",
      description: "Get a scene property. Properties: name, color, tempo, is_empty.",
      inputSchema: {
        type: "object",
        properties: {
          scene_index: { type: "integer" },
          property: { type: "string" },
        },
        required: ["scene_index", "property"],
      },
    },
    {
      name: "scene_set",
      description: "Set a scene property. Properties: name (string), color (int), tempo (float BPM).",
      inputSchema: {
        type: "object",
        properties: {
          scene_index: { type: "integer" },
          property: { type: "string" },
          value: {},
        },
        required: ["scene_index", "property", "value"],
      },
    },
    {
      name: "device_get",
      description: "Get a device property. Properties: name, parameters_name, parameters_value, parameter_value (requires parameter_index).",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          device_index: { type: "integer" },
          property: { type: "string" },
          parameter_index: { type: "integer", description: "Required for parameter_value" },
        },
        required: ["track_index", "device_index", "property"],
      },
    },
    {
      name: "device_set",
      description: "Set one or more device parameter values in a single call. Pass a single parameter_index+value, or use the params array to set multiple at once.",
      inputSchema: {
        type: "object",
        properties: {
          track_index: { type: "integer" },
          device_index: { type: "integer" },
          parameter_index: { type: "integer", description: "For setting a single parameter" },
          value: { type: "number", description: "For setting a single parameter" },
          params: {
            type: "array",
            description: "For setting multiple parameters at once",
            items: {
              type: "object",
              properties: {
                parameter_index: { type: "integer" },
                value: { type: "number" },
              },
              required: ["parameter_index", "value"],
            },
          },
        },
        required: ["track_index", "device_index"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`[tool] ${name}`, args && Object.keys(args).length ? args : "");

  if (name === "test") {
    const result = await sendAndWait("/live/test");
    const val = extractArgs(result);
    return ok(val ? String(val[0]) : "ok");
  }

  if (name === "show_message") {
    send("/live/api/show_message", [s(args.message)]);
    return ok(`Message shown: ${args.message}`);
  }

  if (name === "song_get_many") {
    const results = await Promise.all(
      args.properties.map(p => sendAndWait(`/live/song/get/${p}`).then(r => [p, extractArgs(r)]))
    );
    const lines = results.map(([p, val]) => val ? `${p}: ${val[0]}` : `${p}: unknown`);
    return ok(lines.join("\n"));
  }

  if (name === "song_get") {
    const { property, index_min, index_max } = args;
    if (property === "version") {
      const result = await sendAndWait("/live/application/get/version");
      const val = extractArgs(result);
      return ok(val ? `Ableton Live ${val[0]}.${val[1]}` : "unknown");
    }
    if (property === "log_level") {
      const result = await sendAndWait("/live/api/get/log_level");
      const val = extractArgs(result);
      return ok(val ? String(val[0]) : "unknown");
    }
    if (property === "track_names") {
      const result = await sendAndWait("/live/song/get/track_names", [i(index_min), i(index_max)]);
      const val = extractArgs(result);
      return ok(val ? val.join(", ") : "unknown");
    }
    const result = await sendAndWait(`/live/song/get/${property}`);
    const val = extractArgs(result);
    return ok(val ? `${property}: ${val[0]}` : `${property}: unknown`);
  }

  if (name === "song_set") {
    const { property, value } = args;
    if (property === "log_level") {
      send("/live/api/set/log_level", [s(value)]);
      return ok(`log_level set to ${value}`);
    }
    const floatProps = ["tempo", "current_song_time", "loop_start", "loop_length", "groove_amount"];
    const arg = floatProps.includes(property) ? f(value) : i(value);
    send(`/live/song/set/${property}`, [arg]);
    return ok(`${property} set to ${value}`);
  }

  if (name === "play") {
    send("/live/song/start_playing");
    return ok("Playback started");
  }

  if (name === "stop") {
    send("/live/song/stop_playing");
    return ok("Playback stopped");
  }

  if (name === "undo") {
    send("/live/song/undo");
    return ok("Undo");
  }

  if (name === "redo") {
    send("/live/song/redo");
    return ok("Redo");
  }

  if (name === "song_action") {
    const { action, beats } = args;
    const actionMap = {
      continue_playing: "/live/song/continue_playing",
      tap_tempo: "/live/song/tap_tempo",
      capture_midi: "/live/song/capture_midi",
      stop_all_clips: "/live/song/stop_all_clips",
      trigger_session_record: "/live/song/trigger_session_record",
      jump_to_next_cue: "/live/song/jump_to_next_cue",
      jump_to_prev_cue: "/live/song/jump_to_prev_cue",
    };
    if (action === "jump_by") {
      send("/live/song/jump_by", [f(beats)]);
      return ok(`Jumped by ${beats} beats`);
    }
    if (actionMap[action]) {
      send(actionMap[action]);
      return ok(`${action} done`);
    }
    throw new Error(`Unknown song action: ${action}`);
  }

  if (name === "track_manage") {
    const { action, index } = args;
    if (action === "create_midi") {
      send("/live/song/create_midi_track", [i(index)]);
      return ok(`MIDI track created at index ${index}`);
    }
    if (action === "create_audio") {
      send("/live/song/create_audio_track", [i(index)]);
      return ok(`Audio track created at index ${index}`);
    }
    if (action === "create_return") {
      send("/live/song/create_return_track");
      return ok("Return track created");
    }
    if (action === "delete") {
      send("/live/song/delete_track", [i(index)]);
      return ok(`Track ${index} deleted`);
    }
    if (action === "delete_return") {
      send("/live/song/delete_return_track", [i(index)]);
      return ok(`Return track ${index} deleted`);
    }
    if (action === "duplicate") {
      send("/live/song/duplicate_track", [i(index)]);
      return ok(`Track ${index} duplicated`);
    }
    if (action === "stop_clips") {
      send("/live/track/stop_all_clips", [i(index)]);
      return ok(`All clips stopped on track ${index}`);
    }
    throw new Error(`Unknown track action: ${action}`);
  }

  if (name === "tracks_get") {
    const { property, index_min, index_max } = args;
    const indices = [];
    for (let idx = index_min; idx <= index_max; idx++) indices.push(idx);
    const results = await sendAndCollectMany(
      `/live/track/get/${property}`,
      indices.map(idx => ({ args: [i(idx)], key: idx })),
      vals => vals[0],
    );
    const lines = indices.map(idx => {
      const val = results[idx];
      return val ? `track ${idx}: ${val[1]}` : `track ${idx}: unknown`;
    });
    return ok(lines.join("\n"));
  }

  if (name === "track_get") {
    const { track_index, property, send_index } = args;
    if (property === "send") {
      const result = await sendAndWait("/live/track/get/send", [i(track_index), i(send_index)]);
      const val = extractArgs(result);
      return ok(val ? `send ${send_index}: ${val[2]}` : "unknown");
    }
    if (property === "clips_name") {
      const result = await sendAndWait("/live/track/get/clips/name", [i(track_index)]);
      const val = extractArgs(result);
      return ok(val ? val.slice(1).join(", ") : "none");
    }
    if (property === "devices_name") {
      const result = await sendAndWait("/live/track/get/devices/name", [i(track_index)]);
      const val = extractArgs(result);
      return ok(val ? val.slice(1).join(", ") : "none");
    }
    const result = await sendAndWait(`/live/track/get/${property}`, [i(track_index)]);
    const val = extractArgs(result);
    return ok(val ? `${property}: ${val[1]}` : `${property}: unknown`);
  }

  if (name === "track_set") {
    const { track_index, property, value, send_index } = args;
    if (property === "name") {
      send("/live/track/set/name", [i(track_index), s(value)]);
    } else if (property === "send") {
      send("/live/track/set/send", [i(track_index), i(send_index), f(value)]);
    } else {
      const floatProps = ["volume", "panning"];
      const arg = floatProps.includes(property) ? f(value) : i(value);
      send(`/live/track/set/${property}`, [i(track_index), arg]);
    }
    return ok(`track ${track_index} ${property} set to ${value}`);
  }

  if (name === "clip_slot") {
    const { action, track_index, clip_index, length, target_track, target_clip } = args;
    if (action === "fire") {
      send("/live/clip_slot/fire", [i(track_index), i(clip_index)]);
      return ok(`Clip slot fired: track ${track_index}, slot ${clip_index}`);
    }
    if (action === "has_clip") {
      const result = await sendAndWait("/live/clip_slot/get/has_clip", [i(track_index), i(clip_index)]);
      const val = extractArgs(result);
      return ok(val ? `has_clip: ${val[2]}` : "unknown");
    }
    if (action === "create") {
      send("/live/clip_slot/create_clip", [i(track_index), i(clip_index), f(length * 4)]);
      return ok(`Created clip on track ${track_index}, slot ${clip_index}`);
    }
    if (action === "delete") {
      send("/live/clip_slot/delete_clip", [i(track_index), i(clip_index)]);
      return ok(`Clip deleted at track ${track_index}, slot ${clip_index}`);
    }
    if (action === "duplicate_to") {
      send("/live/clip_slot/duplicate_clip_to", [i(track_index), i(clip_index), i(target_track), i(target_clip)]);
      return ok(`Clip duplicated to track ${target_track}, slot ${target_clip}`);
    }
    throw new Error(`Unknown clip_slot action: ${action}`);
  }

  if (name === "clips_get") {
    const { property, clips } = args;
    const results = await sendAndCollectMany(
      `/live/clip/get/${property}`,
      clips.map(c => ({ args: [i(c.track_index), i(c.clip_index)], key: `${c.track_index}_${c.clip_index}` })),
      vals => `${vals[0]}_${vals[1]}`,
    );
    const lines = clips.map(c => {
      const key = `${c.track_index}_${c.clip_index}`;
      const val = results[key];
      return val ? `track ${c.track_index} clip ${c.clip_index}: ${val[2]}` : `track ${c.track_index} clip ${c.clip_index}: unknown`;
    });
    return ok(lines.join("\n"));
  }

  if (name === "clip_get") {
    const { track_index, clip_index, property } = args;
    if (property === "notes") {
      const result = await sendAndWait("/live/clip/get/notes", [i(track_index), i(clip_index)]);
      const val = extractArgs(result);
      if (!val || val.length <= 2) return ok("No notes");
      const notes = [];
      for (let j = 2; j < val.length; j += 5) {
        notes.push(`pitch=${val[j]} start=${val[j+1]} dur=${val[j+2]} vel=${val[j+3]}`);
      }
      return ok(`Notes:\n${notes.join("\n")}`);
    }
    const result = await sendAndWait(`/live/clip/get/${property}`, [i(track_index), i(clip_index)]);
    const val = extractArgs(result);
    return ok(val ? `${property}: ${val[2]}` : `${property}: unknown`);
  }

  if (name === "clip_set") {
    const { property, clips } = args;
    const floatProps = ["loop_start", "loop_end", "pitch_fine", "gain", "start_marker", "end_marker"];
    const entries = clips ?? [{ track_index: args.track_index, clip_index: args.clip_index, value: args.value }];
    for (const c of entries) {
      if (property === "name") {
        send(`/live/clip/set/${property}`, [i(c.track_index), i(c.clip_index), s(c.value)]);
      } else {
        const arg = floatProps.includes(property) ? f(c.value) : i(c.value);
        send(`/live/clip/set/${property}`, [i(c.track_index), i(c.clip_index), arg]);
      }
    }
    return ok(`Set ${property} on ${entries.length} clip(s)`);
  }

  if (name === "clip_action") {
    const { action, track_index, clip_index } = args;
    if (action === "fire") {
      send("/live/clip/fire", [i(track_index), i(clip_index)]);
      return ok(`Clip started: track ${track_index}, slot ${clip_index}`);
    }
    if (action === "stop") {
      send("/live/clip/stop", [i(track_index), i(clip_index)]);
      return ok(`Clip stopped: track ${track_index}, slot ${clip_index}`);
    }
    if (action === "duplicate_loop") {
      send("/live/clip/duplicate_loop", [i(track_index), i(clip_index)]);
      return ok("Loop duplicated");
    }
    throw new Error(`Unknown clip action: ${action}`);
  }

  if (name === "add_notes") {
    const noteArgs = args.notes.flatMap(n => [
      i(n.pitch), f(n.start), f(n.duration),
      i(n.velocity ?? 100), i(n.mute ?? 0),
    ]);
    send("/live/clip/add/notes", [i(args.track), i(args.slot), ...noteArgs]);
    return ok(`Added ${args.notes.length} notes to clip`);
  }

  if (name === "add_note") {
    send("/live/clip/add/notes", [
      i(args.track), i(args.slot),
      i(args.pitch), f(args.start), f(args.duration),
      i(args.velocity ?? 100), i(args.mute ?? 0),
    ]);
    return ok(`Added note ${args.pitch} to clip`);
  }

  if (name === "remove_notes") {
    send("/live/clip/remove/notes", [
      i(args.track_index), i(args.clip_index),
      i(args.pitch_min), i(args.pitch_max),
      f(args.time_min), f(args.time_max),
    ]);
    return ok("Notes removed");
  }

  if (name === "scene_manage") {
    const { action, scene_index } = args;
    if (action === "create") {
      send("/live/song/create_scene", [i(scene_index)]);
      return ok(`Scene created at index ${scene_index}`);
    }
    if (action === "delete") {
      send("/live/song/delete_scene", [i(scene_index)]);
      return ok(`Scene ${scene_index} deleted`);
    }
    if (action === "duplicate") {
      send("/live/song/duplicate_scene", [i(scene_index)]);
      return ok(`Scene ${scene_index} duplicated`);
    }
    if (action === "fire") {
      send("/live/scene/fire", [i(scene_index)]);
      return ok(`Scene ${scene_index} fired`);
    }
    throw new Error(`Unknown scene action: ${action}`);
  }

  if (name === "scene_get") {
    const { scene_index, property } = args;
    const result = await sendAndWait(`/live/scene/get/${property}`, [i(scene_index)]);
    const val = extractArgs(result);
    return ok(val ? `${property}: ${val[1]}` : `${property}: unknown`);
  }

  if (name === "scene_set") {
    const { scene_index, property, value } = args;
    if (property === "name") {
      send(`/live/scene/set/${property}`, [i(scene_index), s(value)]);
    } else if (property === "tempo") {
      send(`/live/scene/set/${property}`, [i(scene_index), f(value)]);
    } else {
      send(`/live/scene/set/${property}`, [i(scene_index), i(value)]);
    }
    return ok(`scene ${scene_index} ${property} set to ${value}`);
  }

  if (name === "device_get") {
    const { track_index, device_index, property, parameter_index } = args;
    if (property === "parameter_value") {
      const result = await sendAndWait("/live/device/get/parameter/value", [i(track_index), i(device_index), i(parameter_index)]);
      const val = extractArgs(result);
      return ok(val ? `parameter ${parameter_index} value: ${val[3]}` : "unknown");
    }
    if (property === "parameters_name") {
      const result = await sendAndWait("/live/device/get/parameters/name", [i(track_index), i(device_index)]);
      const val = extractArgs(result);
      return ok(val ? val.slice(2).join(", ") : "unknown");
    }
    if (property === "parameters_value") {
      const result = await sendAndWait("/live/device/get/parameters/value", [i(track_index), i(device_index)]);
      const val = extractArgs(result);
      return ok(val ? val.slice(2).join(", ") : "unknown");
    }
    const result = await sendAndWait(`/live/device/get/${property}`, [i(track_index), i(device_index)]);
    const val = extractArgs(result);
    return ok(val ? `${property}: ${val[2]}` : `${property}: unknown`);
  }

  if (name === "device_set") {
    const { track_index, device_index, parameter_index, value, params } = args;
    const entries = params ?? [{ parameter_index, value }];
    for (const p of entries) {
      send("/live/device/set/parameter/value", [i(track_index), i(device_index), i(p.parameter_index), f(p.value)]);
    }
    return ok(`Set ${entries.length} parameter(s) on device ${device_index}`);
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[server] ableton-mcp started");
