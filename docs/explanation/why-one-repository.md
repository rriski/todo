# Why one repository

The page, the API and the task model change together. A new task field touches all three, so one commit holds the whole change and one review sees it.

One repository also gives the tools a single graph of the projects. Nx reads that graph to decide what a change can break. A change to the API leaves the React components alone, so their tests stay in the cache.

The cost is that repository-wide rules have to stay fast, because they run on every change. That is why each check runs at the cheapest stage that can still catch the problem.
