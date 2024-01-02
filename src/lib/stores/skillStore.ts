import { writable } from 'svelte/store';
import type { Achievement } from './openbadgesTypes';

let skills: Array<Achievement> = [];

export const skillStore = writable(skills);
