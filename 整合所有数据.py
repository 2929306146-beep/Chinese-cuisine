import os
import pandas as pd

def read_csv_with_encoding(file_path):
    """尝试多种编码读取CSV文件"""
    encodings = ['utf-8', 'utf-8-sig', 'gbk', 'gb2312']
    
    for encoding in encodings:
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            if not df.empty:
                return df, encoding
        except Exception:
            continue
    
    return None, None

def integrate_store_distribution(root_dir):
    """整合全国门店分布数据"""
    print("正在整合：全国门店分布数据")
    all_data = {}
    
    for folder_name in os.listdir(root_dir):
        folder_path = os.path.join(root_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue
        
        csv_files = [f for f in os.listdir(folder_path) 
                     if '全国门店分布数据' in f and f.endswith('.csv')]
        
        if not csv_files:
            continue
        
        csv_path = os.path.join(folder_path, csv_files[0])
        df, _ = read_csv_with_encoding(csv_path)
        
        if df is None or df.empty:
            continue
        
        # 动态识别列名
        province_col = None
        store_col = None
        
        for col in df.columns:
            if '省份' in col or '地区' in col:
                province_col = col
            if '门店' in col:
                store_col = col
        
        if province_col is None or store_col is None:
            continue
        
        df = df[[province_col, store_col]].set_index(province_col)
        df.columns = [folder_name]
        all_data[folder_name] = df
        print(f"  已读取：{folder_name}")
    
    if all_data:
        merged_df = pd.concat(all_data.values(), axis=1, join='outer')
        merged_df = merged_df.fillna(0).astype(int)
        output_path = os.path.join(root_dir, '全国门店分布数据整合.csv')
        merged_df.to_csv(output_path, encoding='utf-8-sig')
        print(f"  整合完成！共 {len(all_data)} 个菜系\n")

def integrate_top10_brands(root_dir):
    """整合TOP10品牌数据"""
    print("正在整合：TOP10品牌数据")
    all_data = []
    
    for folder_name in os.listdir(root_dir):
        folder_path = os.path.join(root_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue
        
        csv_files = [f for f in os.listdir(folder_path) 
                     if 'TOP10' in f and '品牌' in f and f.endswith('.csv')]
        
        if not csv_files:
            continue
        
        csv_path = os.path.join(folder_path, csv_files[0])
        df, _ = read_csv_with_encoding(csv_path)
        
        if df is None or df.empty:
            continue
        
        df['菜系'] = folder_name
        all_data.append(df)
        print(f"  已读取：{folder_name}")
    
    if all_data:
        merged_df = pd.concat(all_data, ignore_index=True)
        output_path = os.path.join(root_dir, 'TOP10品牌数据整合.csv')
        merged_df.to_csv(output_path, encoding='utf-8-sig', index=False)
        print(f"  整合完成！共 {len(all_data)} 个菜系\n")

def integrate_consumption_distribution(root_dir):
    """整合人均消费分布数据"""
    print("正在整合：人均消费分布数据")
    all_data = {}
    
    for folder_name in os.listdir(root_dir):
        folder_path = os.path.join(root_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue
        
        csv_files = [f for f in os.listdir(folder_path) 
                     if '人均消费' in f and f.endswith('.csv')]
        
        if not csv_files:
            continue
        
        csv_path = os.path.join(folder_path, csv_files[0])
        df, _ = read_csv_with_encoding(csv_path)
        
        if df is None or df.empty:
            continue
        
        # 识别区间和占比列
        range_col = None
        ratio_col = None
        
        for col in df.columns:
            if '区间' in col or '元' in col:
                range_col = col
            if '占比' in col:
                ratio_col = col
        
        if range_col is None or ratio_col is None:
            continue
        
        df = df[[range_col, ratio_col]].set_index(range_col)
        df.columns = [folder_name]
        all_data[folder_name] = df
        print(f"  已读取：{folder_name}")
    
    if all_data:
        merged_df = pd.concat(all_data.values(), axis=1, join='outer')
        merged_df = merged_df.fillna(0)
        output_path = os.path.join(root_dir, '人均消费分布数据整合.csv')
        merged_df.to_csv(output_path, encoding='utf-8-sig')
        print(f"  整合完成！共 {len(all_data)} 个菜系\n")

def integrate_dish_ranking(root_dir):
    """整合推荐菜品榜单数据"""
    print("正在整合：推荐菜品榜单数据")
    all_data = []
    
    for folder_name in os.listdir(root_dir):
        folder_path = os.path.join(root_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue
        
        csv_files = [f for f in os.listdir(folder_path) 
                     if '推荐菜品' in f and f.endswith('.csv')]
        
        if not csv_files:
            continue
        
        csv_path = os.path.join(folder_path, csv_files[0])
        df, _ = read_csv_with_encoding(csv_path)
        
        if df is None or df.empty:
            continue
        
        df['菜系'] = folder_name
        all_data.append(df)
        print(f"  已读取：{folder_name}")
    
    if all_data:
        merged_df = pd.concat(all_data, ignore_index=True)
        output_path = os.path.join(root_dir, '推荐菜品榜单数据整合.csv')
        merged_df.to_csv(output_path, encoding='utf-8-sig', index=False)
        print(f"  整合完成！共 {len(all_data)} 个菜系\n")

def main():
    root_dir = r'd:\桌面\自己组的编程大作业\数据集文件'
    
    print("=" * 50)
    print("开始整合所有数据类型...")
    print("=" * 50 + "\n")
    
    # 整合全国门店分布数据
    integrate_store_distribution(root_dir)
    
    # 整合TOP10品牌数据
    integrate_top10_brands(root_dir)
    
    # 整合人均消费分布数据
    integrate_consumption_distribution(root_dir)
    
    # 整合推荐菜品榜单数据
    integrate_dish_ranking(root_dir)
    
    print("=" * 50)
    print("所有数据整合完成！")
    print("=" * 50)

if __name__ == '__main__':
    main()