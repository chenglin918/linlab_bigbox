import urllib.request
import os

urls = {
    "screen1.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2VlNDMyMzI3MzQyNjQ4ZjViNmUyZjBkYjQ2NWU3ZDc5EgsSBxD7j63yvgsYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTc2NDAzNjQ3OTY3NDUwNTE1&filename=&opi=89354086",
    "screen2.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzcwMzYyZWNhNzIzYTRiZGRhOTc3ZWI5OGU0NDM5OTQ2EgsSBxD7j63yvgsYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTc2NDAzNjQ3OTY3NDUwNTE1&filename=&opi=89354086",
    "screen3.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzhmOWMyMWEyOWU1NjRiZGJiNTA1NGVlNjk0OWZhM2U5EgsSBxD7j63yvgsYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTc2NDAzNjQ3OTY3NDUwNTE1&filename=&opi=89354086",
    "screen4.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzc4OTgyZTdhZTk1ZTQ5YTViOTg4Y2VjYTI1YmY3YjA3EgsSBxD7j63yvgsYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTc2NDAzNjQ3OTY3NDUwNTE1&filename=&opi=89354086",
    "screen1.png": "https://lh3.googleusercontent.com/aida/AOfcidUUA058Lzf1TRBttz6j8Z1Vlp-1DZ9dYIukOkO0iHEAQd5Nrk5oVvZ1IqosXcZWwrLVwTobrjpJTgAw-TO52X0CV92VCg2Ni-zjoJvxUCgQKBWx16Zpq7vY2WXb3-bquxmjWyTaqWt-11A95-L7O1a7SpwtsXwC-GZVKICxD9K6zWkP6qc4UabxRs7LWUBGzPUehNbKNiZvTsNnjN-YcFzK_HRldx9tw1SibC-c0dRIZo9G2lHnz-sG5_Y",
    "screen2.png": "https://lh3.googleusercontent.com/aida/AOfcidUNzHtTtWxf1J2sWwxUpBESGxqOk2ZuXMbMcvUoTyXw_io5e20kDtKsb7EbSHQQfQabkmnG_Fst-i57uksyOaTY5MCnZSbYV7f26dS5J-GaHg4SeK9EEqidt2sxaSOd_gzz7BM6xVgP3x3zfEX6dC2AXezEE4RMV4Nfn1trgn3zCZ57efjm6mFAnGwXU5XRANd2X6E_PCLIlx7BJegNwx4vlz6fftHVt8_6ZHLSBPl1Pwed7UnpxH2uOik",
    "screen3.png": "https://lh3.googleusercontent.com/aida/AOfcidWZVSfsWRslVoHUj0oHic-doVjcPOPUO-Chm3gEKdLHAGXzCY5qkeGNCs8jui1SjI5492JaCLFumPvAi4qgCzL_nl1gbb0cy_tXoLThYLyRK1k8E4di1McM-R9LfH_t4iTIbN_B3SapUXAcMNBLMbvSzINsLP6JtmdmW3bhrkmSZwV0_zLZxpj6Vg-npjVMk95VRjDBLa35W76gUBZoqLYOkLTj1s2txFp_X8dfm_-H1Y6lxkyHfANzoQ",
    "screen4.png": "https://lh3.googleusercontent.com/aida/AOfcidUsrJeO3RMnsTeVXmqleEdPBnwxsw601kemDZxFrqEj4R2teGVCdXdTg1_9BknINJiKUARUhhKYoZ-t8G5MUn20zVBB7pkEOFovFD7_yzJCoCCaagM8jwLQgzl3Yk3k8t1AmSxRniqCiUKXxI_OlHdSpQAVcQTJQwD6J1YqphH5C0LuBzQtR67jrIITs-JWqiuaqmiSMdv68q1Vp49armR1WO58Ch6imY_bd8oZdoKrgpJYwaEMIEtELvU"
}

out_dir = r"d:\OneDrive - University of Victoria\OneDrive - University of Victoria\MPhD (2023)-Yongxuan Gao\Big_ box\website\stitch_assets"
os.makedirs(out_dir, exist_ok=True)

for name, url in urls.items():
    try:
        out_path = os.path.join(out_dir, name)
        urllib.request.urlretrieve(url, out_path)
        print(f"Downloaded {name}")
    except Exception as e:
        print(f"Failed to download {name}: {e}")
