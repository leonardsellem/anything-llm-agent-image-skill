# Custom Agent Skill Developer Guide – AnythingLLM Docs

Custom Agent Skill Developer Guide ~ AnythingLLM
=============== 

Developer Guide

**This guide is intended for developers who want to create custom agent skills for AnythingLLM.**

How to develop custom agent skills
==================================

Prerequisites[](https://docs.anythingllm.com/agent/custom/developer-guide#prerequisites)
----------------------------------------------------------------------------------------

1.  NodeJS 18+
2.  Yarn
3.  AnythingLLM running in some supported environment see [here](https://docs.anythingllm.com/agent/custom/introduction) for more information.

Guidelines for creation of custom agent skills[](https://docs.anythingllm.com/agent/custom/developer-guide#guidelines-for-creation-of-custom-agent-skills)
--------------------------------------------------------------------------------------------------------------------------------

1.  Custom agent skills must be written in JavaScript and will execute within a NodeJS environment.
2.  You can bundle any NodeJS package you want within your custom agent skill, but it must be present in the folder structure of your custom agent skill.
3.  All functions must return a string value, anything else may break the agent invocation.
4.  You _should_ provide a `README.md` file at the root of your custom agent skill with a description, any additional requirements and how to use the custom agent skill.
5.  You _must_ define your plugin with an associated `plugin.json` file at the root of your custom agent skill folder.
6.  The _must_ define your entry point of your custom agent skill as a `handler.js` file.
7.  You _must_ wrap your entire custom agent skill in a folder with the same `name` property that is defined in the `plugin.json` file.

Hot loading of custom agent skills[](https://docs.anythingllm.com/agent/custom/developer-guide#hot-loading-of-custom-agent-skills)
--------------------------------------------------------------------------------------------------------------------------------

️💡

If you are in an active agent invocation when you make changes to your custom agent skill, you will need to `/exit` the current session for the changes to take effect.

If you just added a new custom agent skill you will need to revisit or reload the page for the new skill to be shown in the UI.

AnythingLLM supports hot loading of custom agent skills. This means that you can make changes to your custom agent skill and see the changes without having to restart the agent or the instance of AnythingLLM.

Where to place your custom agent skill code[](https://docs.anythingllm.com/agent/custom/developer-guide#where-to-place-your-custom-agent-skill-code)
--------------------------------------------------------------------------------------------------------------------------------

All agents skills must be placed in the appropriate folder in your AnythingLLM storage directory folder. This can be found in multiple locations depending on the environment you are running AnythingLLM in. In all versions you are looking for the matching folder of the `STORAGE_DIR` environment variable.

️💡

Your entire custom agent skill folder should be wrapped in a folder with the same `hubId` property as the associated `plugin.json` file.

### Docker[](https://docs.anythingllm.com/agent/custom/developer-guide#docker)

Your storage directory should be mounted as a volume in your Docker container startup command - [which can be found here](https://docs.anythingllm.com/installation-docker/local-docker). This will be the value of the `STORAGE_LOCATION` command variable.

Then you will need to create this subfolder within the storage directory: `plugins/agent-skills`

### Local Development[](https://docs.anythingllm.com/agent/custom/developer-guide#local-development)

When running AnythingLLM locally, your storage directory is likely mounted in the `server/storage` directory.

Then you will need to create this subfolder within the storage directory: `plugins/agent-skills`

### Desktop[](https://docs.anythingllm.com/agent/custom/developer-guide#desktop)

When running AnythingLLM on Desktop, your storage directory can be [found using this guide](https://docs.anythingllm.com/installation-desktop/storage#where-is-my-data-located).

Then you will need to create this subfolder within the storage directory: `plugins/agent-skills`

File structure[](https://docs.anythingllm.com/agent/custom/developer-guide#file-structure)
------------------------------------------------------------------------------------------

Your custom agent skill should be wrapped in a folder with the same `hubId` property that is defined in the `plugin.json` file.

_See the plugin.json [reference](https://docs.anythingllm.com/agent/custom/plugin-json) for more information on the plugin.json file, its properties and how to use them._

```
// example plugin.json
{
  "name": "This is my human readable name",
  "hubId": "my-custom-agent-skill" // THIS MUST BE THE SAME AS THE parent folder name. Can be any string.
}
```

Folder structure for associated agent skill: NOTE: The folder name must match the `hubId` property in the `plugin.json` file.

```
plugins/agent-skills/my-custom-agent-skill
|-- plugin.json
|-- handler.js
|-- // You can add any additional files you want to the folder and reference them in the handler.js file!
```

Plugin.json Reference[](https://docs.anythingllm.com/agent/custom/developer-guide#pluginjson-reference)
-------------------------------------------------------------------------------------------------------

See [here](https://docs.anythingllm.com/agent/custom/plugin-json) for more information on the plugin.json file, its properties and how to use them.

[Introduction](https://docs.anythingllm.com/agent/custom/introduction "Introduction")[plugin.json reference](https://docs.anythingllm.com/agent/custom/plugin-json "plugin.json reference")

Light

* * *

MIT 2025 © [Mintplex Labs](https://github.com/Mintplex-Labs).