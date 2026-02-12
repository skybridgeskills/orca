<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import DarkModeToggle from './DarkModeToggle.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import PopupMenu from './PopupMenu.svelte';
	import FaUserCircle from 'svelte-icons-pack/fa/FaUserCircle.js';
	import IconButton from './IconButton.svelte';
	import NavItem from './NavItem.svelte';
	import { session } from '$lib/stores/sessionStore';
	import { SvelteComponent, onDestroy, onMount } from 'svelte';
	import { imageUrl } from '$lib/utils/imageUrl';
	import { browser } from '$app/environment';

	export let org: App.Organization;
	let mobileMenuExpanded = false;
	const closeMobileMenu = () => {
		mobileMenuExpanded = false;
	};

	let profileDropdownExpanded = false;
	const toggleDropdownExpanded = (e: Event | KeyboardEvent) => {
		e.stopPropagation();
		e.preventDefault();

		// Some browsers call both the keypress and click events if the user presses spacebar
		// If that's the case, we'll let this function handle it on the click event only.
		if (!(e instanceof KeyboardEvent) || e.key != ' ')
			profileDropdownExpanded = !profileDropdownExpanded;
		if (profileDropdownMenu && profileDropdownMenu.handleOpen) profileDropdownMenu.handleOpen();
	};
	const closeDropdown = () => {
		profileDropdownExpanded = false;
	};
	let profileDropdownMenu: SvelteComponent;
	onMount(() => {
		if (browser) document.addEventListener('click', closeDropdown);
	});
	onDestroy(() => {
		if (browser) document?.removeEventListener('click', closeDropdown);
	});
</script>

<nav class="bg-white border-gray-200 rounded dark:bg-gray-800">
	{#if org.primaryColor}
		<div class="w-full h-2" style="background-color: {org.primaryColor}" />
	{/if}
	<div class="max-w-7xl mx-auto">
		<div class="flex flex-wrap justify-between items-center mx-auto">
			<div class="max-sm:container w-full md:w-auto max-md:mx-auto px-2 sm:px-4 py-2.5">
				<div class="flex justify-between">
					<a
						href="/"
						class="flex items-center md:items-start focus:ring-2 focus:ring-gray-200 rounded-lg dark:focus:ring-gray-600"
					>
						<img
							src={org.logo ? imageUrl(org.logo) : '/orcalogo.svg'}
							class="mr-3 h-6 sm:h-9"
							alt="ORCA: Open Recognition"
						/>
						<span
							class="self-center text-xl font-semibold whitespace-nowrap leading-8 dark:text-white"
							>{org.name}</span
						>
					</a>
					<button
						type="button"
						class="inline-flex items-center p-2 ml-3 text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
						aria-controls="navbar-default"
						aria-expanded={mobileMenuExpanded}
						on:click={() => {
							mobileMenuExpanded = !mobileMenuExpanded;
						}}
					>
						<span class="sr-only">{!mobileMenuExpanded ? 'Open main menu' : 'Close main menu'}</span
						>
						<svg
							class="w-6 h-6"
							aria-hidden="true"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
							><path
								fill-rule="evenodd"
								d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
								clip-rule="evenodd"
							/></svg
						>
					</button>
				</div>
			</div>

			<button
				class="w-full md:block md:w-auto px-2 sm:px-4 py-0 bg-gray-100 md:bg-transparent dark:bg-gray-900 md:dark:bg-transparent"
				on:keypress={closeMobileMenu}
				on:click={closeMobileMenu}
				id="navbar-default"
			>
				<ul
					class={`${
						!mobileMenuExpanded ? 'max-md:hidden' : ''
					} container mx-auto flex flex-col p-4 mt-0 rounded-lg border border-gray-100 md:flex-row md:space-x-8 md:mt-0 md:text-sm md:font-medium md:border-0 bg-white dark:bg-gray-800 md:dark:bg-gray-800 dark:border-gray-700`}
				>
					<NavItem href="/achievements" title={m.antsy_grand_rabbit_gaze()} />
					<NavItem href="/about" title={m.mellow_elegant_parrot_ask()} on:click on:keypress />
					{#if !$session?.id}
						<!-- No user is logged in, but they might try to log in -->
						<li>
							<a
								href="/login"
								class="block py-2 pr-4 pl-3 leading-8 text-gray-700 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent"
								>{m.bright_swift_eagle_login()}</a
							>
						</li>
						<li>
							<DarkModeToggle on:click on:keypress />
						</li>
						<li>
							<LanguageSelector />
						</li>
					{:else}
						<!-- For authenticated users -->
						<NavItem href="/backpack" title={m.bold_petty_dog_march()} on:click on:keypress />
						<NavItem href="/members" title={m.steady_plane_cuckoo_fry()} on:click on:keypress />
						<li class="hidden md:block">
							<IconButton
								id="profile-menu-button"
								src={FaUserCircle}
								size="24"
								on:click={toggleDropdownExpanded}
								on:keypress={toggleDropdownExpanded}
								text={m.dull_cuddly_jackdaw_intend()}
							/>

							<!-- Popup menu -->
							<PopupMenu
								menuId="profileDropdownNavbar"
								buttonId="profile-menu-button"
								hidden={!profileDropdownExpanded}
								bind:this={profileDropdownMenu}
							>
								<ul
									class="py-2 text-sm text-gray-700 dark:text-gray-400"
									aria-labelledby="profile-menu-button"
								>
									<li>
										<a
											href="/members/{$session?.user?.id}"
											class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
											>{m.dull_cuddly_jackdaw_intend()}</a
										>
									</li>
									<li>
										<a
											href="/settings"
											class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
											>{m.piquant_weary_okapi_enchant()}</a
										>
									</li>
								</ul>
								<div class="py-2">
									<form
										action="/logout"
										method="POST"
										class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
									>
										<button type="submit" class="text-sm text-gray-700 dark:text-gray-400"
											>{m.calm_steady_lynx_logout()}</button
										>
									</form>
								</div>
								<li class="py-2">
									<div class="flex flex-row mx-auto">
										<DarkModeToggle on:click on:keypress />
										<LanguageSelector />
									</div>
								</li>
							</PopupMenu>
						</li>
						<NavItem
							href="/members/{$session?.user?.id}"
							title={m.dull_cuddly_jackdaw_intend()}
							class="md:hidden"
						/>
						<NavItem href="/settings" title={m.piquant_weary_okapi_enchant()} class="md:hidden" />
						<li class="md:hidden">
							<DarkModeToggle on:click on:keypress />
						</li>
						<li class="md:hidden">
							<LanguageSelector />
						</li>
						<li class="md:hidden">
							<form
								action="/logout"
								method="POST"
								class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
							>
								<button type="submit" class="text-md text-gray-700 dark:text-gray-400"
									>{m.calm_steady_lynx_logout()}</button
								>
							</form>
						</li>
					{/if}
				</ul>
			</button>
		</div>
	</div>
</nav>
