import { writable } from 'svelte/store';
import type { Achievement } from './openbadgesTypes';

const skills: Array<Achievement> = [];

export const skillStore = writable(skills);
