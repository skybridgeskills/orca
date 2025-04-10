<script lang="ts">
  import Button from "./Button.svelte";

  interface Props {
    text?: string;
    sourceUrl?: string;
    fileName?: string | null;
    class?: string;
    id?: string;
    buttonType?: "button" | "submit";
    moreProps?: Object;
    submodule?: App.ButtonRole;
  }

  let {
    text = "",
    sourceUrl = "",
    fileName = null,
    class: klass = "",
    id = "",
    buttonType = "button",
    moreProps = {},
    submodule = "primary",
  }: Props = $props();

  const download = async () => {
    const response = await fetch(sourceUrl, { method: "POST", body: "" });

    const responseBlob = await response.blob();
    const href = URL.createObjectURL(responseBlob);
    const aTag = document.createElement("a");
    aTag.href = href;
    aTag.download = fileName || "download.json"; // TODO: extract extension from response header content type

    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);
  };
</script>

<Button
  {id}
  {buttonType}
  {submodule}
  {...moreProps}
  onclick={download}
  class={klass}>{text}</Button
>
