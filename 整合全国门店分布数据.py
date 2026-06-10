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

def main():
    # 根目录
    root_dir = r'd:\桌面\自己组的编程大作业\数据集文件'
    
    # 用于存储所有数据的字典
    all_data = {}
    
    # 可能的省份列名
    province_columns = ['省份', '省份/地区', '地区']
    # 可能的门店数列名
    store_columns = ['门店数(家)', '门店数量', '门店数']
    
    # 遍历所有文件夹
    for folder_name in os.listdir(root_dir):
        folder_path = os.path.join(root_dir, folder_name)
        
        # 只处理目录
        if not os.path.isdir(folder_path):
            continue
        
        # 查找门店分布数据文件（处理文件名可能有空格的情况）
        csv_files = [f for f in os.listdir(folder_path) 
                     if '全国门店分布数据' in f and f.endswith('.csv')]
        
        if not csv_files:
            print(f"警告：{folder_name} 文件夹中未找到门店分布数据文件")
            continue
        
        csv_path = os.path.join(folder_path, csv_files[0])
        
        try:
            # 读取CSV文件（尝试多种编码）
            df, encoding = read_csv_with_encoding(csv_path)
            
            if df is None:
                print(f"警告：{folder_name} 无法读取，尝试了多种编码")
                continue
            
            # 检查是否为空文件
            if df.empty:
                print(f"警告：{folder_name} 的文件为空")
                continue
            
            # 动态识别列名
            province_col = None
            store_col = None
            
            for col in df.columns:
                if any(p in col for p in province_columns):
                    province_col = col
                if any(s in col for s in store_columns):
                    store_col = col
            
            if province_col is None or store_col is None:
                print(f"警告：{folder_name} 未识别到省份或门店数列，列名：{df.columns.tolist()}")
                continue
            
            # 提取省份和门店数列，设置省份为索引
            df = df[[province_col, store_col]].set_index(province_col)
            
            # 重命名列名为文件夹名
            df.columns = [folder_name]
            
            # 添加到字典
            all_data[folder_name] = df
            
            print(f"成功读取：{folder_name}")
            
        except Exception as e:
            print(f"读取 {folder_name} 时出错：{e}")
    
    if not all_data:
        print("未找到任何门店分布数据")
        return
    
    # 合并所有数据
    merged_df = pd.concat(all_data.values(), axis=1, join='outer')
    
    # 重新排序，按总门店数降序排列省份
    merged_df['总计'] = merged_df.sum(axis=1)
    merged_df = merged_df.sort_values('总计', ascending=False).drop('总计', axis=1)
    
    # 填充缺失值为0
    merged_df = merged_df.fillna(0).astype(int)
    
    # 保存结果
    output_path = os.path.join(root_dir, '全国门店分布数据整合.csv')
    merged_df.to_csv(output_path, encoding='utf-8-sig')
    
    print(f"\n整合完成！结果已保存到：{output_path}")
    print(f"共整合了 {len(all_data)} 个菜系的数据")
    print(f"覆盖了 {len(merged_df)} 个省份")

if __name__ == '__main__':
    main()