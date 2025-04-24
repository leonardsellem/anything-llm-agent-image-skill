# Uploading to the AnythingLLM Community Hub – AnythingLLM Docs

Uploading to the AnythingLLM Community Hub ~ AnythingLLM
=============== 

community-hub

Uploading to the AnythingLLM Community Hub

Uploading to the AnythingLLM Community Hub
==========================================

AnythingLLM allows you to upload items to the AnythingLLM Community Hub to share with the world or privately with just your team.

Some items can be created directly on the [AnythingLLM Community Hub (opens in a new tab)](https://hub.anythingllm.com/):

*   System prompts
*   Slash commands

However, other items can only be uploaded to the AnythingLLM Community Hub as they require custom code and are more like "plugins" for AnythingLLM.

These items are:

*   Agent skills
*   Data connectors
*   Workspaces

Uploading Agent Skills[](https://docs.anythingllm.com/community-hub/upload#uploading-agent-skills)
--------------------------------------------------------------------------------------------------

Agent skills extend the functionality of AnythingLLM by allowing you to add custom tools for your local LLM to leverage when using the [`@agent` directive.](https://docs.anythingllm.com/agent/overview)

Custom agents skills allow you to build _anything_ that you can imagine and have that work natively within AnythingLLM with minimal setup and technical knowledge.

[Learn more about how to create agent skills →](https://docs.anythingllm.com/agent/custom/developer-guide)

### The Anythingllm-hub-cli tool[](https://docs.anythingllm.com/community-hub/upload#the-anythingllm-hub-cli-tool)

AnythingLLM offers a CLI tool called [`anythingllm-hub-cli` (opens in a new tab)](https://www.npmjs.com/package/@mintplex-labs/anythingllm-hub-cli) that allows you to upload items to the AnythingLLM Community Hub easily.

To upload an agent skill to the AnythingLLM Community Hub, you can use the following commands to upload your skill privately or publicly.

```
# Install the CLI tool
npm install -g @mintplex-labs/anythingllm-hub-cli@latest
```

To create a new agent skill from our template, you can run the following command:

```
npx @mintplex-labs/anythingllm-hub-cli init --type agent-skill --output ./my-new-skill
# Creates a folder called `my-new-skill` with the agent skill template
# This should contain your plugin.json and handler.js file to get started.
```

To being the upload process you will need a [Connection key](https://docs.anythingllm.com/community-hub/faq#connecting-to-the-anythingllm-community-hub).

```
npx @mintplex-labs/anythingllm-hub-cli login
# You will be prompted to enter your connection key
# this will authenticate you and save your connection key to the CLI
# this will also save your profile information so you don't have to login again in the future
 
# You can check your connection key by running `npx @mintplex-labs/anythingllm-hub-cli config`
```

Next, you can upload your agent skill to the AnythingLLM Community Hub by running the following command:

```
# Assumes you are in the root of the agent skill directory you want to upload
npx @mintplex-labs/anythingllm-hub-cli upload --type agent-skill --path .
# > Any missing details like name, description, etc. will be prompted for
# > You will be prompted if you would like to make the item public or private
# > You will be asked to confirm the files being uploaded
# > This will begin the upload process - it is automatic and will notify you once complete
 
# > You will be given a URL to view your item on the AnythingLLM Community Hub once it is uploaded
```

🎉 **Congratulations!** You have now uploaded your agent skill to the AnythingLLM Community Hub.

_it's that easy!_

Uploading Data Connectors[](https://docs.anythingllm.com/community-hub/upload#uploading-data-connectors)
--------------------------------------------------------------------------------------------------------

_data connectors are currently not supported_

Uploading Workspaces[](https://docs.anythingllm.com/community-hub/upload#uploading-workspaces)
----------------------------------------------------------------------------------------------

_workspaces are currently not supported_

Last updated on March 27, 2025

[Importing from the AnythingLLM Community Hub](https://docs.anythingllm.com/community-hub/import "Importing from the AnythingLLM Community Hub")[What is the Community Hub?](https://docs.anythingllm.com/community-hub/about "What is the Community Hub?")

System

* * *

MIT 2025 © [Mintplex Labs](https://github.com/Mintplex-Labs).